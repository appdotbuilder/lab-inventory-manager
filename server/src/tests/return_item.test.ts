
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, itemsTable, borrowingHistoryTable } from '../db/schema';
import { type ReturnItemInput } from '../schema';
import { returnItem } from '../handlers/return_item';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user' as const
};

// Test item data
const testItem = {
  name: 'Test Laptop',
  asset_code: 'LAPTOP001',
  description: 'MacBook Pro for testing',
  condition: 'excellent' as const,
  storage_location: 'Office A',
  quantity: 1
};

describe('returnItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a borrowed item successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        ...testItem,
        current_user_id: user.id
      })
      .returning()
      .execute();
    const item = itemResult[0];

    // Create borrowing record
    const borrowingResult = await db.insert(borrowingHistoryTable)
      .values({
        item_id: item.id,
        borrower_id: user.id,
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'borrowed'
      })
      .returning()
      .execute();
    const borrowing = borrowingResult[0];

    const input: ReturnItemInput = {
      borrowing_id: borrowing.id,
      notes: 'Item returned in good condition'
    };

    const result = await returnItem(input);

    // Verify the return record
    expect(result.id).toEqual(borrowing.id);
    expect(result.status).toEqual('returned');
    expect(result.actual_return_date).toBeInstanceOf(Date);
    expect(result.notes).toEqual('Item returned in good condition');
    expect(result.item_id).toEqual(item.id);
    expect(result.borrower_id).toEqual(user.id);
  });

  it('should update borrowing history in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        ...testItem,
        current_user_id: user.id
      })
      .returning()
      .execute();
    const item = itemResult[0];

    // Create borrowing record
    const borrowingResult = await db.insert(borrowingHistoryTable)
      .values({
        item_id: item.id,
        borrower_id: user.id,
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'borrowed',
        notes: 'Original borrowing notes'
      })
      .returning()
      .execute();
    const borrowing = borrowingResult[0];

    const input: ReturnItemInput = {
      borrowing_id: borrowing.id,
      notes: 'Return notes'
    };

    await returnItem(input);

    // Verify database record was updated
    const updatedBorrowingRecords = await db.select()
      .from(borrowingHistoryTable)
      .where(eq(borrowingHistoryTable.id, borrowing.id))
      .execute();

    const updatedBorrowing = updatedBorrowingRecords[0];
    expect(updatedBorrowing.status).toEqual('returned');
    expect(updatedBorrowing.actual_return_date).toBeInstanceOf(Date);
    expect(updatedBorrowing.notes).toEqual('Return notes');
  });

  it('should clear item current_user_id', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create test item assigned to user
    const itemResult = await db.insert(itemsTable)
      .values({
        ...testItem,
        current_user_id: user.id
      })
      .returning()
      .execute();
    const item = itemResult[0];

    // Create borrowing record
    const borrowingResult = await db.insert(borrowingHistoryTable)
      .values({
        item_id: item.id,
        borrower_id: user.id,
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'borrowed'
      })
      .returning()
      .execute();
    const borrowing = borrowingResult[0];

    const input: ReturnItemInput = {
      borrowing_id: borrowing.id
    };

    await returnItem(input);

    // Verify item's current_user_id was cleared
    const updatedItemRecords = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, item.id))
      .execute();

    const updatedItem = updatedItemRecords[0];
    expect(updatedItem.current_user_id).toBeNull();
    expect(updatedItem.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve existing notes when no new notes provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        ...testItem,
        current_user_id: user.id
      })
      .returning()
      .execute();
    const item = itemResult[0];

    // Create borrowing record with existing notes
    const borrowingResult = await db.insert(borrowingHistoryTable)
      .values({
        item_id: item.id,
        borrower_id: user.id,
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'borrowed',
        notes: 'Original borrowing notes'
      })
      .returning()
      .execute();
    const borrowing = borrowingResult[0];

    const input: ReturnItemInput = {
      borrowing_id: borrowing.id
      // No notes provided
    };

    const result = await returnItem(input);

    expect(result.notes).toEqual('Original borrowing notes');
  });

  it('should throw error for non-existent borrowing record', async () => {
    const input: ReturnItemInput = {
      borrowing_id: 999999
    };

    expect(returnItem(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when item already returned', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values(testItem)
      .returning()
      .execute();
    const item = itemResult[0];

    // Create already returned borrowing record
    const borrowingResult = await db.insert(borrowingHistoryTable)
      .values({
        item_id: item.id,
        borrower_id: user.id,
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        actual_return_date: new Date(),
        status: 'returned'
      })
      .returning()
      .execute();
    const borrowing = borrowingResult[0];

    const input: ReturnItemInput = {
      borrowing_id: borrowing.id
    };

    expect(returnItem(input)).rejects.toThrow(/already been returned/i);
  });
});
