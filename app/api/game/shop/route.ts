import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { playerProfiles } from '@/lib/db/schema'
import { getOrCreateProfile, getSessionUser, isSameOriginJson } from '@/lib/game-server'

const itemPrices: Record<string, number> = {
  junior: 0,
  assistant: 150,
  manager: 300,
  master: 500,
  midnight: 0,
  cyber: 200,
  cozy: 250,
  hint: 50,
  energy: 40,
  streak: 100,
}

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return Response.json({ error: 'Invalid request' }, { status: 403 })
  const user = await getSessionUser(request)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const itemId = body?.itemId
  if (typeof itemId !== 'string' || !(itemId in itemPrices)) {
    return Response.json({ error: 'Invalid item' }, { status: 400 })
  }

  await getOrCreateProfile(user.id, user.name)
  const result = await db.transaction(async (tx) => {
    const [profile] = await tx.select().from(playerProfiles).where(eq(playerProfiles.userId, user.id)).for('update').limit(1)
    if (!profile) return { error: 'Profile unavailable' as const }
    if (profile.owned.includes(itemId)) return { error: 'Item already owned' as const }
    const price = itemPrices[itemId]
    if (profile.coins < price) return { error: 'Not enough coins' as const }

    const [updatedProfile] = await tx.update(playerProfiles)
      .set({
        coins: sql`${playerProfiles.coins} - ${price}`,
        owned: [...profile.owned, itemId],
        updatedAt: new Date(),
      })
      .where(eq(playerProfiles.userId, user.id))
      .returning()

    return { profile: updatedProfile }
  })

  if ('error' in result) return Response.json({ error: result.error }, { status: 409 })
  return Response.json(result)
}
