import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { gameAttempts, playerProfiles } from '@/lib/db/schema'
import { getOrCreateProfile, getSessionUser, isSameOriginJson } from '@/lib/game-server'

const correctChoices = [[0, 1], [1, 1], [0, 1], [1, 1], [1, 1], [1, 0], [1, 2], [1, 2]]
const baseXp = 20
const maxSpeedBonus = 30
const timedSeconds = 45

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return Response.json({ error: 'Invalid request' }, { status: 403 })
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const mission = Number(body?.mission)
  const question = Number(body?.question)
  const choice = Number(body?.choice)
  if (!Number.isInteger(mission) || mission < 1 || mission > 8 || !Number.isInteger(question) || question < 0 || question > 1 || !Number.isInteger(choice) || choice < 0 || choice > 3) {
    return Response.json({ error: 'Invalid answer' }, { status: 400 })
  }

  const profile = await getOrCreateProfile(user.id, user.name)
  if (!profile?.unlocked[mission - 1]) return Response.json({ error: 'Mission locked' }, { status: 403 })
  const isCorrect = choice === correctChoices[mission - 1][question]

  const result = await db.transaction(async (tx) => {
    const [attempt] = await tx
      .select()
      .from(gameAttempts)
      .where(and(eq(gameAttempts.userId, user.id), eq(gameAttempts.mission, mission), eq(gameAttempts.question, question)))
      .for('update')
      .limit(1)

    if (!attempt) return { error: 'Quiz was not started' as const }

    if (attempt.answeredAt) {
      const [currentProfile] = await tx.select().from(playerProfiles).where(eq(playerProfiles.userId, user.id)).limit(1)
      return { correct: true, xpAwarded: attempt.xpAwarded, speedBonus: attempt.xpAwarded - baseXp, profile: currentProfile }
    }

    if (!isCorrect) {
      await tx.update(gameAttempts)
        .set({ wrongAttempts: sql`${gameAttempts.wrongAttempts} + 1`, isCorrect: false })
        .where(and(eq(gameAttempts.userId, user.id), eq(gameAttempts.mission, mission), eq(gameAttempts.question, question)))
      return { correct: false }
    }

    const elapsedSeconds = Math.max(0, (Date.now() - attempt.startedAt.getTime()) / 1000)
    const speedBonus = Math.round(maxSpeedBonus * Math.max(0, 1 - elapsedSeconds / timedSeconds))
    const xpAwarded = baseXp + speedBonus
    const [currentProfile] = await tx.select().from(playerProfiles).where(eq(playerProfiles.userId, user.id)).for('update').limit(1)
    if (!currentProfile) return { error: 'Profile unavailable' as const }

    const achievements = Array.from(new Set([...currentProfile.achievements, 'quiz-master']))
    const [updatedProfile] = await tx.update(playerProfiles)
      .set({
        xp: sql`${playerProfiles.xp} + ${xpAwarded}`,
        correctAnswers: sql`${playerProfiles.correctAnswers} + 1`,
        achievements,
        updatedAt: new Date(),
      })
      .where(eq(playerProfiles.userId, user.id))
      .returning()

    await tx.update(gameAttempts)
      .set({ answeredAt: new Date(), isCorrect: true, xpAwarded })
      .where(and(eq(gameAttempts.userId, user.id), eq(gameAttempts.mission, mission), eq(gameAttempts.question, question)))

    return { correct: true, xpAwarded, speedBonus, profile: updatedProfile }
  })

  if ('error' in result) return Response.json({ error: result.error }, { status: 409 })
  return Response.json(result)
}
