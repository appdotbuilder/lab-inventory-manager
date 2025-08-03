
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, itemsTable, borrowingHistoryTable } from '../db/schema';
import { getBorrowingHistory } from '../handlers/get_borrowing_history';

describe('getBorrowingHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no borrowing history exists', async () => {
    const result = await getBorrowingHistory();
    expect(result).toEqual([]);
  });

  it('should return all borrowing history when no itemId provided', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test items
    const [item1] = await db.insert(itemsTable)
      .values({
        name: 'Test Item 1',
        asset_code: 'TEST001',
        description: 'First test item',
        condition: 'good',
        storage_location: 'Room A',
        quantity: 1
      })
      .returning()
      .execute();

    const [item2] = await db.insert(itemsTable)
      .values({
        name: 'Test Item 2',
        asset_code: 'TEST002',
        description: 'Second test item',
        condition: 'excellent',
        storage_location: 'Room B',
        quantity: 1
      })
      .returning()
      .execute();

    // Create borrowing history records
    const expectedDate = new Date('2024-01-15');
    await db.insert(borrowingHistoryTable)
      .values([
        {
          item_id: item1.id,
          borrower_id: user.id,
          expected_return_date: expectedDate,
          status: 'borrowed',
          notes: 'First borrow'
        },
        {
          item_id: item2.id,
          borrower_id: user.id,
          expected_return_date: expectedDate,
          status: 'returned',
          notes: 'Second borrow'
        }
      ])
      .execute();

    const result = await getBorrowingHistory();

    expect(result).toHaveLength(2);
    
    // Find records by their item_id rather than assuming order
    const item1Record = result.find(r => r.item_id === item1.id);
    const item2Record = result.find(r => r.item_id === item2.id);

    expect(item1Record).toBeDefined();
    expect(item1Record!.borrower_id).toEqual(user.id);
    expect(item1Record!.status).toEqual('borrowed');
    expect(item1Record!.notes).toEqual('First borrow');
    expect(item1Record!.borrowed_date).toBeInstanceOf(Date);
    expect(item1Record!.expected_return_date).toEqual(expectedDate);

    expect(item2Record).toBeDefined();
    expect(item2Record!.borrower_id).toEqual(user.id);
    expect(item2Record!.status).toEqual('returned');
    expect(item2Record!.notes).toEqual('Second borrow');
    expect(item2Record!.borrowed_date).toBeInstanceOf(Date);
    expect(item2Record!.expected_return_date).toEqual(expectedDate);
  });

  it('should return borrowing history for specific item when itemId provided', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test items
    const [item1] = await db.insert(itemsTable)
      .values({
        name: 'Test Item 1',
        asset_code: 'TEST001',
        description: 'First test item',
        condition: 'good',
        storage_location: 'Room A',
        quantity: 1
      })
      .returning()
      .execute();

    const [item2] = await db.insert(itemsTable)
      .values({
        name: 'Test Item 2',
        asset_code: 'TEST002',
        description: 'Second test item',
        condition: 'excellent',
        storage_location: 'Room B',
        quantity: 1
      })
      .returning()
      .execute();

    // Create borrowing history records for both items
    const expectedDate = new Date('2024-01-15');
    await db.insert(borrowingHistoryTable)
      .values([
        {
          item_id: item1.id,
          borrower_id: user.id,
          expected_return_date: expectedDate,
          status: 'borrowed',
          notes: 'Item 1 borrow'
        },
        {
          item_id: item2.id,
          borrower_id: user.id,
          expected_return_date: expectedDate,
          status: 'returned',
          notes: 'Item 2 borrow'
        }
      ])
      .execute();

    // Get history for specific item
    const result = await getBorrowingHistory(item1.id);

    expect(result).toHaveLength(1);
    expect(result[0].item_id).toEqual(item1.id);
    expect(result[0].borrower_id).toEqual(user.id);
    expect(result[0].status).toEqual('borrowed');
    expect(result[0].notes).toEqual('Item 1 borrow');
    expect(result[0].borrowed_date).toBeInstanceOf(Date);
    expect(result[0].expected_return_date).toEqual(expectedDate);
  });

  it('should return empty array for non-existent item', async () => {
    const result = await getBorrowingHistory(999);
    expect(result).toEqual([]);
  });

  it('should order results by created_at descending (most recent first)', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test item
    const [item] = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        asset_code: 'TEST001',
        description: 'Test item',
        condition: 'good',
        storage_location: 'Room A',
        quantity: 1
      })
      .returning()
      .execute();

    // Create multiple borrowing records with slight delays to ensure different created_at times
    const expectedDate = new Date('2024-01-15');
    
    const [first] = await db.insert(borrowingHistoryTable)
      .values({
        item_id: item.id,
        borrower_id: user.id,
        expected_return_date: expectedDate,
        status: 'returned',
        notes: 'First borrow'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [second] = await db.insert(borrowingHistoryTable)
      .values({
        item_id: item.id,
        borrower_id: user.id,
        expected_return_date: expectedDate,
        status: 'borrowed',
        notes: 'Second borrow'
      })
      .returning()
      .execute();

    const result = await getBorrowingHistory(item.id);

    expect(result).toHaveLength(2);
    // Most recent should be first
    expect(result[0].notes).toEqual('Second borrow');
    expect(result[1].notes).toEqual('First borrow');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });
});
