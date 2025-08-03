
import { z } from 'zod';

// Enums
export const itemConditionEnum = z.enum(['excellent', 'good', 'fair', 'poor', 'damaged']);
export const userRoleEnum = z.enum(['admin', 'user']);
export const borrowStatusEnum = z.enum(['borrowed', 'returned', 'overdue']);

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  role: userRoleEnum,
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Item schema
export const itemSchema = z.object({
  id: z.number(),
  name: z.string(),
  asset_code: z.string(),
  description: z.string().nullable(),
  purchase_date: z.coerce.date().nullable(),
  condition: itemConditionEnum,
  storage_location: z.string(),
  quantity: z.number().int().nonnegative(),
  current_user_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Item = z.infer<typeof itemSchema>;

// Borrowing history schema
export const borrowingHistorySchema = z.object({
  id: z.number(),
  item_id: z.number(),
  borrower_id: z.number(),
  borrowed_date: z.coerce.date(),
  expected_return_date: z.coerce.date(),
  actual_return_date: z.coerce.date().nullable(),
  status: borrowStatusEnum,
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type BorrowingHistory = z.infer<typeof borrowingHistorySchema>;

// Input schemas for creating items
export const createItemInputSchema = z.object({
  name: z.string().min(1),
  asset_code: z.string().min(1),
  description: z.string().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  condition: itemConditionEnum,
  storage_location: z.string().min(1),
  quantity: z.number().int().positive(),
  current_user_id: z.number().nullable().optional()
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

// Input schemas for updating items
export const updateItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  asset_code: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  condition: itemConditionEnum.optional(),
  storage_location: z.string().min(1).optional(),
  quantity: z.number().int().nonnegative().optional(),
  current_user_id: z.number().nullable().optional()
});

export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

// Input schemas for borrowing
export const createBorrowingInputSchema = z.object({
  item_id: z.number(),
  borrower_id: z.number(),
  expected_return_date: z.coerce.date(),
  notes: z.string().nullable().optional()
});

export type CreateBorrowingInput = z.infer<typeof createBorrowingInputSchema>;

// Input schemas for returning items
export const returnItemInputSchema = z.object({
  borrowing_id: z.number(),
  notes: z.string().nullable().optional()
});

export type ReturnItemInput = z.infer<typeof returnItemInputSchema>;

// Search and filter schemas
export const searchItemsInputSchema = z.object({
  query: z.string().optional(),
  condition: itemConditionEnum.optional(),
  storage_location: z.string().optional(),
  available_only: z.boolean().optional()
});

export type SearchItemsInput = z.infer<typeof searchItemsInputSchema>;

// User input schemas
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  full_name: z.string().min(1),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
