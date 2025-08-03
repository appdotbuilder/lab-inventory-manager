
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, usersTable } from '../db/schema';
import { type CreateItemInput, type CreateUserInput } from '../schema';
import { getItems } from '../handlers/get_items';

describe('getItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no items exist', async () => {
    const result = await getItems();
    expect(result).toEqual([]);
  });

  it('should return all items', async () => {
    // Create test items
    await db.insert(itemsTable).values([
      {
        name: 'Test Item 1',
        asset_code: 'ASSET001',
        description: 'First test item',
        condition: 'excellent',
        storage_location: 'Warehouse A',
        quantity: 5
      },
      {
        name: 'Test Item 2',
        asset_code: 'ASSET002',
        description: 'Second test item',
        condition: 'good',
        storage_location: 'Warehouse B',
        quantity: 3
      }
    ]).execute();

    const result = await getItems();

    expect(result).toHaveLength(2);
    
    // Check first item
    expect(result[0].name).toEqual('Test Item 1');
    expect(result[0].asset_code).toEqual('ASSET001');
    expect(result[0].description).toEqual('First test item');
    expect(result[0].condition).toEqual('excellent');
    expect(result[0].storage_location).toEqual('Warehouse A');
    expect(result[0].quantity).toEqual(5);
    expect(result[0].current_user_id).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second item
    expect(result[1].name).toEqual('Test Item 2');
    expect(result[1].asset_code).toEqual('ASSET002');
    expect(result[1].condition).toEqual('good');
    expect(result[1].quantity).toEqual(3);
  });

  it('should return items with current user information', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'user'
    }).returning().execute();

    const userId = userResult[0].id;

    // Create items, one with current user assigned
    await db.insert(itemsTable).values([
      {
        name: 'Available Item',
        asset_code: 'AVAIL001',
        condition: 'excellent',
        storage_location: 'Warehouse A',
        quantity: 1,
        current_user_id: null
      },
      {
        name: 'Borrowed Item',
        asset_code: 'BORR001',
        condition: 'good',
        storage_location: 'Warehouse B',
        quantity: 1,
        current_user_id: userId
      }
    ]).execute();

    const result = await getItems();

    expect(result).toHaveLength(2);

    // Find items by asset code for reliable testing
    const availableItem = result.find(item => item.asset_code === 'AVAIL001');
    const borrowedItem = result.find(item => item.asset_code === 'BORR001');

    expect(availableItem).toBeDefined();
    expect(availableItem!.current_user_id).toBeNull();

    expect(borrowedItem).toBeDefined();
    expect(borrowedItem!.current_user_id).toEqual(userId);
  });

  it('should handle different item conditions and storage locations', async () => {
    // Create items with various conditions
    await db.insert(itemsTable).values([
      {
        name: 'Excellent Item',
        asset_code: 'EXC001',
        condition: 'excellent',
        storage_location: 'Storage Room 1',
        quantity: 2
      },
      {
        name: 'Fair Item',
        asset_code: 'FAIR001',
        condition: 'fair',
        storage_location: 'Storage Room 2',
        quantity: 1
      },
      {
        name: 'Damaged Item',
        asset_code: 'DMG001',
        condition: 'damaged',
        storage_location: 'Repair Shop',
        quantity: 1
      }
    ]).execute();

    const result = await getItems();

    expect(result).toHaveLength(3);

    const conditions = result.map(item => item.condition);
    expect(conditions).toContain('excellent');
    expect(conditions).toContain('fair');
    expect(conditions).toContain('damaged');

    const locations = result.map(item => item.storage_location);
    expect(locations).toContain('Storage Room 1');
    expect(locations).toContain('Storage Room 2');
    expect(locations).toContain('Repair Shop');
  });
});
