import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const playerProfiles = pgTable('player_profile', {
  userId: text('userId').primaryKey(),
  displayName: text('displayName').notNull(),
  avatar: text('avatar').notNull().default('agent-1'),
  xp: integer('xp').notNull().default(0),
  coins: integer('coins').notNull().default(126),
  correctAnswers: integer('correctAnswers').notNull().default(0),
  owned: jsonb('owned').$type<string[]>().notNull().default(['junior', 'midnight']),
  completed: jsonb('completed').$type<number[]>().notNull().default([]),
  rewarded: jsonb('rewarded').$type<number[]>().notNull().default([]),
  achievements: jsonb('achievements').$type<string[]>().notNull().default([]),
  unlocked: jsonb('unlocked').$type<boolean[]>().notNull().default([true, false, false, false, false, false, false, false]),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const gameAttempts = pgTable('game_attempt', {
  userId: text('userId').notNull(),
  mission: integer('mission').notNull(),
  question: integer('question').notNull(),
  startedAt: timestamp('startedAt').notNull().defaultNow(),
  answeredAt: timestamp('answeredAt'),
  isCorrect: boolean('isCorrect').notNull().default(false),
  wrongAttempts: integer('wrongAttempts').notNull().default(0),
  xpAwarded: integer('xpAwarded').notNull().default(0),
}, (table) => [primaryKey({ columns: [table.userId, table.mission, table.question] })])
