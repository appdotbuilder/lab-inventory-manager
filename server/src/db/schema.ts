
import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const itemConditionEnum = pgEnum('item_condition', ['excellent', 'good', 'fair', 'poor', 'damaged']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const borrowStatusEnum = pgEnum('borrow_status', ['borrowed', 'returned', 'overdue']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Items table
export const itemsTable = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  asset_code: text('asset_code').notNull().unique(),
  description: text('description'),
  purchase_date: timestamp('purchase_date'),
  condition: itemConditionEnum('condition').notNull().default('good'),
  storage_location: text('storage_location').notNull(),
  quantity: integer('quantity').notNull().default(1),
  current_user_id: integer('current_user_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Borrowing history table
export const borrowingHistoryTable = pgTable('borrowing_history', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id').notNull(),
  borrower_id: integer('borrower_id').notNull(),
  borrowed_date: timestamp('borrowed_date').defaultNow().notNull(),
  expected_return_date: timestamp('expected_return_date').notNull(),
  actual_return_date: timestamp('actual_return_date'),
  status: borrowStatusEnum('status').notNull().default('borrowed'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  borrowedItems: many(itemsTable),
  borrowingHistory: many(borrowingHistoryTable),
}));

export const itemsRelations = relations(itemsTable, ({ one, many }) => ({
  currentUser: one(usersTable, {
    fields: [itemsTable.current_user_id],
    references: [usersTable.id],
  }),
  borrowingHistory: many(borrowingHistoryTable),
}));

export const borrowingHistoryRelations = relations(borrowingHistoryTable, ({ one }) => ({
  item: one(itemsTable, {
    fields: [borrowingHistoryTable.item_id],
    references: [itemsTable.id],
  }),
  borrower: one(usersTable, {
    fields: [borrowingHistoryTable.borrower_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;
export type BorrowingHistory = typeof borrowingHistoryTable.$inferSelect;
export type NewBorrowingHistory = typeof borrowingHistoryTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  items: itemsTable, 
  borrowingHistory: borrowingHistoryTable 
};
