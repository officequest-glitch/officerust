import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { playerProfiles } from '@/lib/db/schema'

export async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user ?? null
}

export function isSameOriginJson(request: Request) {
  const origin = request.headers.get('origin')
  const contentType = request.headers.get('content-type')
  return Boolean(origin && origin === new URL(request.url).origin && contentType?.includes('application/json'))
}

export async function getOrCreateProfile(userId: string, userName: string) {
  const [existing] = await db
    .select()
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId))
    .limit(1)

  if (existing) return existing

  await db
    .insert(playerProfiles)
    .values({ userId, displayName: userName.trim().slice(0, 24) || 'Player' })
    .onConflictDoNothing({ target: playerProfiles.userId })

  const [profile] = await db
    .select()
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId))
    .limit(1)

  return profile
}
