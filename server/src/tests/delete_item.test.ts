
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, usersTable, borrowingHistoryTable } from '../db/schema';
import { deleteItem } from '../handlers/delete_item';
import { eq } from 'drizzle-orm';
import { type CreateUserInput, type CreateItemInput, type CreateBorrowingInput } from '../schema';

describe('deleteItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing item', async () => {
    // Create a user first (for potential foreign key relationships)
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create an item
    const item = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        asset_code: 'TEST-001',
        description: 'A test item',
        condition: 'good',
        storage_location: 'Storage Room A',
        quantity: 1
      })
      .returning()
      .execute();

    const itemId = item[0].id;

    // Delete the item
    const result = await deleteItem(itemId);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify item no longer exists in database
    const deletedItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, itemId))
      .execute();

    expect(deletedItems).toHaveLength(0);
  });

  it('should return false for non-existent item', async () => {
    const result = await deleteItem(999);

    expect(result).toBe(false);
  });

  it('should return false when item has borrowing history', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        username: 'borrower',
        email: 'borrower@example.com',
        full_name: 'Test Borrower',
        role: 'user'
      })
      .returning()
      .execute();

    // Create an item
    const item = await db.insert(itemsTable)
      .values({
        name: 'Test Item with History',
        asset_code: 'TEST-002',
        description: 'An item with borrowing history',
        condition: 'good',
        storage_location: 'Storage Room B',
        quantity: 1,
        current_user_id: user[0].id
      })
      .returning()
      .execute();

    // Create borrowing history for the item
    await db.insert(borrowingHistoryTable)
      .values({
        item_id: item[0].id,
        borrower_id: user[0].id,
        expected_return_date: new Date('2024-12-31'),
        status: 'borrowed'
      })
      .execute();

    // Attempt to delete the item
    const result = await deleteItem(item[0].id);

    // Should return false due to foreign key constraint
    expect(result).toBe(false);

    // Verify item still exists in database
    const existingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, item[0].id))
      .execute();

    expect(existingItems).toHaveLength(1);
  });

  it('should handle multiple items correctly', async () => {
    // Create multiple items
    const items = await db.insert(itemsTable)
      .values([
        {
          name: 'Item 1',
          asset_code: 'TEST-003',
          condition: 'good',
          storage_location: 'Storage Room C',
          quantity: 1
        },
        {
          name: 'Item 2',
          asset_code: 'TEST-004',
          condition: 'excellent',
          storage_location: 'Storage Room C',
          quantity: 2
        }
      ])
      .returning()
      .execute();

    // Delete first item
    const result1 = await deleteItem(items[0].id);
    expect(result1).toBe(true);

    // Verify only first item was deleted
    const remainingItems = await db.select()
      .from(itemsTable)
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].id).toBe(items[1].id);
    expect(remainingItems[0].name).toBe('Item 2');

    // Delete second item
    const result2 = await deleteItem(items[1].id);
    expect(result2).toBe(true);

    // Verify all items are deleted
    const allItems = await db.select()
      .from(itemsTable)
      .execute();

    expect(allItems).toHaveLength(0);
  });
});
