
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, itemsTable, borrowingHistoryTable } from '../db/schema';
import { getOverdueItems } from '../handlers/get_overdue_items';

describe('getOverdueItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no overdue items exist', async () => {
    const result = await getOverdueItems();
    expect(result).toEqual([]);
  });

  it('should return overdue borrowing records', async () => {
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
    const userId = userResult[0].id;

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        asset_code: 'TEST001',
        description: 'A test item',
        condition: 'good',
        storage_location: 'Storage A',
        quantity: 1
      })
      .returning()
      .execute();
    const itemId = itemResult[0].id;

    // Create overdue borrowing record (expected return date in the past)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

    const borrowingResult = await db.insert(borrowingHistoryTable)
      .values({
        item_id: itemId,
        borrower_id: userId,
        expected_return_date: pastDate,
        actual_return_date: null,
        status: 'borrowed',
        notes: 'Test borrowing'
      })
      .returning()
      .execute();

    const result = await getOverdueItems();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(borrowingResult[0].id);
    expect(result[0].item_id).toEqual(itemId);
    expect(result[0].borrower_id).toEqual(userId);
    expect(result[0].expected_return_date).toBeInstanceOf(Date);
    expect(result[0].actual_return_date).toBeNull();
    expect(result[0].status).toEqual('borrowed');
    expect(result[0].notes).toEqual('Test borrowing');
  });

  it('should not return items with future expected return dates', async () => {
    // Create test user and item
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        asset_code: 'TEST001',
        description: 'A test item',
        condition: 'good',
        storage_location: 'Storage A',
        quantity: 1
      })
      .returning()
      .execute();
    const itemId = itemResult[0].id;

    // Create borrowing record with future expected return date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

    await db.insert(borrowingHistoryTable)
      .values({
        item_id: itemId,
        borrower_id: userId,
        expected_return_date: futureDate,
        actual_return_date: null,
        status: 'borrowed'
      })
      .execute();

    const result = await getOverdueItems();
    expect(result).toHaveLength(0);
  });

  it('should not return items that have been returned', async () => {
    // Create test user and item
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        asset_code: 'TEST001',
        description: 'A test item',
        condition: 'good',
        storage_location: 'Storage A',
        quantity: 1
      })
      .returning()
      .execute();
    const itemId = itemResult[0].id;

    // Create overdue borrowing record that has been returned
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() - 2); // Returned 2 days ago

    await db.insert(borrowingHistoryTable)
      .values({
        item_id: itemId,
        borrower_id: userId,
        expected_return_date: pastDate,
        actual_return_date: returnDate,
        status: 'returned'
      })
      .execute();

    const result = await getOverdueItems();
    expect(result).toHaveLength(0);
  });

  it('should return multiple overdue items', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'testuser1',
        email: 'test1@example.com',
        full_name: 'Test User 1',
        role: 'user'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        full_name: 'Test User 2',
        role: 'user'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create test items
    const item1Result = await db.insert(itemsTable)
      .values({
        name: 'Test Item 1',
        asset_code: 'TEST001',
        condition: 'good',
        storage_location: 'Storage A',
        quantity: 1
      })
      .returning()
      .execute();
    const item1Id = item1Result[0].id;

    const item2Result = await db.insert(itemsTable)
      .values({
        name: 'Test Item 2',
        asset_code: 'TEST002',
        condition: 'excellent',
        storage_location: 'Storage B',
        quantity: 1
      })
      .returning()
      .execute();
    const item2Id = item2Result[0].id;

    // Create multiple overdue borrowing records
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    await db.insert(borrowingHistoryTable)
      .values([
        {
          item_id: item1Id,
          borrower_id: user1Id,
          expected_return_date: pastDate,
          actual_return_date: null,
          status: 'borrowed'
        },
        {
          item_id: item2Id,
          borrower_id: user2Id,
          expected_return_date: pastDate,
          actual_return_date: null,
          status: 'borrowed'
        }
      ])
      .execute();

    const result = await getOverdueItems();

    expect(result).toHaveLength(2);
    expect(result.every(item => item.expected_return_date < new Date())).toBe(true);
    expect(result.every(item => item.actual_return_date === null)).toBe(true);
    expect(result.every(item => item.status === 'borrowed')).toBe(true);
  });
});
