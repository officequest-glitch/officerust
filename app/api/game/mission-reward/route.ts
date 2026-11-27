import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { gameAttempts, playerProfiles } from '@/lib/db/schema'
import { getOrCreateProfile, getSessionUser, isSameOriginJson } from '@/lib/game-server'

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return Response.json({ error: 'Invalid request' }, { status: 403 })
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const mission = Number(body?.mission)
  if (!Number.isInteger(mission) || mission < 1 || mission > 8) {
    return Response.json({ error: 'Invalid mission' }, { status: 400 })
  }

  const profile = await getOrCreateProfile(user.id, user.name)
  if (!profile?.unlocked[mission - 1]) return Response.json({ error: 'Mission locked' }, { status: 403 })

  const result = await db.transaction(async (tx) => {
    const [currentProfile] = await tx.select().from(playerProfiles).where(eq(playerProfiles.userId, user.id)).for('update').limit(1)
    if (!currentProfile) return { error: 'Profile unavailable' as const }
    if (currentProfile.rewarded.includes(mission)) return { profile: currentProfile, alreadyRewarded: true }
    if (mission > 1 && !currentProfile.completed.includes(mission - 1)) return { error: 'Complete the previous mission first' as const }

    const attempts = await tx.select({ question: gameAttempts.question, wrongAttempts: gameAttempts.wrongAttempts })
      .from(gameAttempts)
      .where(and(eq(gameAttempts.userId, user.id), eq(gameAttempts.mission, mission), eq(gameAttempts.isCorrect, true)))
    if (attempts.length !== 2 || !attempts.some((attempt) => attempt.question === 0) || !attempts.some((attempt) => attempt.question === 1)) {
      return { error: 'Complete both quiz questions first' as const }
    }

    const completed = Array.from(new Set([...currentProfile.completed, mission])).sort((a, b) => a - b)
    const rewarded = Array.from(new Set([...currentProfile.rewarded, mission])).sort((a, b) => a - b)
    const unlocked = [...currentProfile.unlocked]
    if (mission < 8) unlocked[mission] = true
    const achievements = new Set(currentProfile.achievements)
    if (mission === 1) achievements.add('first-mission')
    if (mission === 6) achievements.add('fast-typist')
    if (attempts.every((attempt) => attempt.wrongAttempts === 0)) achievements.add('perfect-score')
    if (mission === 8) achievements.add('mission-explorer')

    const [updatedProfile] = await tx.update(playerProfiles)
      .set({
        xp: sql`${playerProfiles.xp} + 60`,
        coins: sql`${playerProfiles.coins} + 20`,
        completed,
        rewarded,
        unlocked,
        achievements: [...achievements],
        updatedAt: new Date(),
      })
      .where(eq(playerProfiles.userId, user.id))
      .returning()

    return { profile: updatedProfile, alreadyRewarded: false }
  })

  if ('error' in result) return Response.json({ error: result.error }, { status: 409 })
  return Response.json(result)
}
