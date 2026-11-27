import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { playerProfiles } from '@/lib/db/schema'
import { getOrCreateProfile, getSessionUser, isSameOriginJson } from '@/lib/game-server'

const allowedAvatars = new Set(['agent-1', 'agent-2', 'agent-3', 'agent-4'])

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getOrCreateProfile(user.id, user.name)
  if (!profile) return Response.json({ error: 'Profile unavailable' }, { status: 500 })
  return Response.json({ profile })
}

export async function PUT(request: Request) {
  if (!isSameOriginJson(request)) return Response.json({ error: 'Invalid request' }, { status: 403 })
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid profile' }, { status: 400 })
  }

  const values: { displayName?: string; avatar?: string; updatedAt: Date } = { updatedAt: new Date() }
  if ('displayName' in body) {
    if (typeof body.displayName !== 'string') return Response.json({ error: 'Invalid name' }, { status: 400 })
    const displayName = body.displayName.trim().replace(/\s+/g, ' ')
    if (displayName.length < 1 || displayName.length > 24 || /[\u0000-\u001f\u007f]/.test(displayName)) {
      return Response.json({ error: 'Invalid name' }, { status: 400 })
    }
    values.displayName = displayName
  }

  if ('avatar' in body) {
    if (typeof body.avatar !== 'string' || !allowedAvatars.has(body.avatar)) {
      return Response.json({ error: 'Invalid avatar' }, { status: 400 })
    }
    values.avatar = body.avatar
  }

  await getOrCreateProfile(user.id, user.name)
  const [profile] = await db
    .update(playerProfiles)
    .set(values)
    .where(eq(playerProfiles.userId, user.id))
    .returning()

  return Response.json({ profile })
}
