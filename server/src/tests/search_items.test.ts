
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, usersTable } from '../db/schema';
import { type SearchItemsInput, type CreateUserInput } from '../schema';
import { searchItems } from '../handlers/search_items';

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user'
};

const testItems = [
  {
    name: 'Laptop Dell XPS',
    asset_code: 'LAPTOP001',
    description: 'High-performance laptop',
    condition: 'excellent' as const,
    storage_location: 'Office A',
    quantity: 1
  },
  {
    name: 'Wireless Mouse',
    asset_code: 'MOUSE001',
    description: 'Bluetooth mouse',
    condition: 'good' as const,
    storage_location: 'Office B',
    quantity: 5
  },
  {
    name: 'Monitor Samsung',
    asset_code: 'MON001',
    description: '24-inch monitor',
    condition: 'fair' as const,
    storage_location: 'Office A',
    quantity: 2
  }
];

describe('searchItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all items when no filters are applied', async () => {
    // Create test items
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {};
    const results = await searchItems(input);

    expect(results).toHaveLength(3);
    expect(results.map(item => item.name)).toContain('Laptop Dell XPS');
    expect(results.map(item => item.name)).toContain('Wireless Mouse');
    expect(results.map(item => item.name)).toContain('Monitor Samsung');
  });

  it('should search by item name', async () => {
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {
      query: 'Laptop'
    };
    const results = await searchItems(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Laptop Dell XPS');
    expect(results[0].asset_code).toEqual('LAPTOP001');
  });

  it('should search by asset code', async () => {
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {
      query: 'MOUSE001'
    };
    const results = await searchItems(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Wireless Mouse');
    expect(results[0].asset_code).toEqual('MOUSE001');
  });

  it('should search case-insensitively', async () => {
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {
      query: 'laptop'
    };
    const results = await searchItems(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Laptop Dell XPS');
  });

  it('should filter by condition', async () => {
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {
      condition: 'excellent'
    };
    const results = await searchItems(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Laptop Dell XPS');
    expect(results[0].condition).toEqual('excellent');
  });

  it('should filter by storage location', async () => {
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {
      storage_location: 'Office A'
    };
    const results = await searchItems(input);

    expect(results).toHaveLength(2);
    expect(results.map(item => item.name)).toContain('Laptop Dell XPS');
    expect(results.map(item => item.name)).toContain('Monitor Samsung');
    results.forEach(item => {
      expect(item.storage_location).toEqual('Office A');
    });
  });

  it('should filter for available items only', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create items, one with current_user_id (borrowed) and two without (available)
    const itemsWithBorrowing = [
      { ...testItems[0], current_user_id: userId }, // Borrowed
      { ...testItems[1] }, // Available
      { ...testItems[2] }  // Available
    ];

    await db.insert(itemsTable).values(itemsWithBorrowing).execute();

    const input: SearchItemsInput = {
      available_only: true
    };
    const results = await searchItems(input);

    expect(results).toHaveLength(2);
    expect(results.map(item => item.name)).toContain('Wireless Mouse');
    expect(results.map(item => item.name)).toContain('Monitor Samsung');
    expect(results.map(item => item.name)).not.toContain('Laptop Dell XPS');
    results.forEach(item => {
      expect(item.current_user_id).toBeNull();
    });
  });

  it('should combine multiple filters', async () => {
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {
      query: 'Office',
      condition: 'excellent',
      storage_location: 'Office A'
    };
    const results = await searchItems(input);

    // Should find no results because query 'Office' doesn't match any item name/asset_code
    expect(results).toHaveLength(0);
  });

  it('should combine text search with location filter', async () => {
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {
      query: 'Monitor',
      storage_location: 'Office A'
    };
    const results = await searchItems(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Monitor Samsung');
    expect(results[0].storage_location).toEqual('Office A');
  });

  it('should return empty array when no matches found', async () => {
    await db.insert(itemsTable).values(testItems).execute();

    const input: SearchItemsInput = {
      query: 'NonexistentItem'
    };
    const results = await searchItems(input);

    expect(results).toHaveLength(0);
  });
});
