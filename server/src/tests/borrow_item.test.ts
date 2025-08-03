
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, itemsTable, borrowingHistoryTable } from '../db/schema';
import { type CreateBorrowingInput } from '../schema';
import { borrowItem } from '../handlers/borrow_item';
import { eq } from 'drizzle-orm';

describe('borrowItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testItemId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        asset_code: 'TEST001',
        description: 'A test item',
        condition: 'good',
        storage_location: 'Shelf A',
        quantity: 1,
        current_user_id: null
      })
      .returning()
      .execute();
    testItemId = itemResult[0].id;
  });

  it('should create a borrowing record', async () => {
    const input: CreateBorrowingInput = {
      item_id: testItemId,
      borrower_id: testUserId,
      expected_return_date: new Date('2024-12-31'),
      notes: 'Test borrowing'
    };

    const result = await borrowItem(input);

    expect(result.item_id).toEqual(testItemId);
    expect(result.borrower_id).toEqual(testUserId);
    expect(result.expected_return_date).toEqual(new Date('2024-12-31'));
    expect(result.actual_return_date).toBeNull();
    expect(result.status).toEqual('borrowed');
    expect(result.notes).toEqual('Test borrowing');
    expect(result.id).toBeDefined();
    expect(result.borrowed_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update item current_user_id', async () => {
    const input: CreateBorrowingInput = {
      item_id: testItemId,
      borrower_id: testUserId,
      expected_return_date: new Date('2024-12-31'),
      notes: null
    };

    await borrowItem(input);

    const updatedItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, testItemId))
      .execute();

    expect(updatedItem[0].current_user_id).toEqual(testUserId);
    expect(updatedItem[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save borrowing record to database', async () => {
    const input: CreateBorrowingInput = {
      item_id: testItemId,
      borrower_id: testUserId,
      expected_return_date: new Date('2024-12-31'),
      notes: 'Database test'
    };

    const result = await borrowItem(input);

    const borrowingRecords = await db.select()
      .from(borrowingHistoryTable)
      .where(eq(borrowingHistoryTable.id, result.id))
      .execute();

    expect(borrowingRecords).toHaveLength(1);
    expect(borrowingRecords[0].item_id).toEqual(testItemId);
    expect(borrowingRecords[0].borrower_id).toEqual(testUserId);
    expect(borrowingRecords[0].status).toEqual('borrowed');
    expect(borrowingRecords[0].notes).toEqual('Database test');
  });

  it('should throw error when borrower does not exist', async () => {
    const input: CreateBorrowingInput = {
      item_id: testItemId,
      borrower_id: 99999, // Non-existent user ID
      expected_return_date: new Date('2024-12-31'),
      notes: null
    };

    expect(borrowItem(input)).rejects.toThrow(/borrower with id 99999 does not exist/i);
  });

  it('should throw error when item does not exist', async () => {
    const input: CreateBorrowingInput = {
      item_id: 99999, // Non-existent item ID
      borrower_id: testUserId,
      expected_return_date: new Date('2024-12-31'),
      notes: null
    };

    expect(borrowItem(input)).rejects.toThrow(/item with id 99999 does not exist/i);
  });

  it('should throw error when item is already borrowed', async () => {
    // First, borrow the item
    const firstBorrowInput: CreateBorrowingInput = {
      item_id: testItemId,
      borrower_id: testUserId,
      expected_return_date: new Date('2024-12-31'),
      notes: null
    };

    await borrowItem(firstBorrowInput);

    // Try to borrow the same item again
    const secondBorrowInput: CreateBorrowingInput = {
      item_id: testItemId,
      borrower_id: testUserId,
      expected_return_date: new Date('2024-12-31'),
      notes: null
    };

    expect(borrowItem(secondBorrowInput)).rejects.toThrow(/item with id \d+ is already borrowed/i);
  });

  it('should handle null notes correctly', async () => {
    const input: CreateBorrowingInput = {
      item_id: testItemId,
      borrower_id: testUserId,
      expected_return_date: new Date('2024-12-31'),
      notes: null
    };

    const result = await borrowItem(input);

    expect(result.notes).toBeNull();
  });
});
