import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { gameAttempts, playerProfiles } from '@/lib/db/schema'
import { getOrCreateProfile, getSessionUser, isSameOriginJson } from '@/lib/game-server'

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return Response.json({ error: 'Invalid request' }, { status: 403 })
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const mission = Number(body?.mission)
  const question = Number(body?.question)
  if (!Number.isInteger(mission) || mission < 1 || mission > 8 || !Number.isInteger(question) || question < 0 || question > 1) {
    return Response.json({ error: 'Invalid quiz' }, { status: 400 })
  }

  const profile = await getOrCreateProfile(user.id, user.name)
  if (!profile?.unlocked[mission - 1]) return Response.json({ error: 'Mission locked' }, { status: 403 })

  await db
    .insert(gameAttempts)
    .values({ userId: user.id, mission, question })
    .onConflictDoNothing()

  const [attempt] = await db
    .select({ startedAt: gameAttempts.startedAt, answeredAt: gameAttempts.answeredAt, xpAwarded: gameAttempts.xpAwarded })
    .from(gameAttempts)
    .where(and(eq(gameAttempts.userId, user.id), eq(gameAttempts.mission, mission), eq(gameAttempts.question, question)))
    .limit(1)

  return Response.json({ attempt })
}
