import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { playerProfiles } from '@/lib/db/schema'

export async function GET() {
  const players = await db
    .select({ displayName: playerProfiles.displayName, avatar: playerProfiles.avatar, xp: playerProfiles.xp })
    .from(playerProfiles)
    .orderBy(desc(playerProfiles.xp), sql`${playerProfiles.updatedAt} ASC`)
    .limit(50)

  return Response.json({ players }, { headers: { 'Cache-Control': 'no-store' } })
}
