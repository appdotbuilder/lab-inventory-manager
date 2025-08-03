
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, usersTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { createItem } from '../handlers/create_item';
import { eq } from 'drizzle-orm';

// Basic test input
const testInput: CreateItemInput = {
  name: 'Test Laptop',
  asset_code: 'LAP001',
  description: 'Dell Latitude laptop for testing',
  purchase_date: new Date('2024-01-15'),
  condition: 'excellent',
  storage_location: 'IT Storage Room A',
  quantity: 1,
  current_user_id: null
};

// Minimal required input
const minimalInput: CreateItemInput = {
  name: 'Minimal Item',
  asset_code: 'MIN001',
  condition: 'good',
  storage_location: 'Storage Room B',
  quantity: 5
};

describe('createItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an item with all fields', async () => {
    const result = await createItem(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Laptop');
    expect(result.asset_code).toEqual('LAP001');
    expect(result.description).toEqual('Dell Latitude laptop for testing');
    expect(result.purchase_date).toEqual(new Date('2024-01-15'));
    expect(result.condition).toEqual('excellent');
    expect(result.storage_location).toEqual('IT Storage Room A');
    expect(result.quantity).toEqual(1);
    expect(result.current_user_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an item with minimal required fields', async () => {
    const result = await createItem(minimalInput);

    expect(result.name).toEqual('Minimal Item');
    expect(result.asset_code).toEqual('MIN001');
    expect(result.description).toBeNull();
    expect(result.purchase_date).toBeNull();
    expect(result.condition).toEqual('good');
    expect(result.storage_location).toEqual('Storage Room B');
    expect(result.quantity).toEqual(5);
    expect(result.current_user_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save item to database', async () => {
    const result = await createItem(testInput);

    // Query using proper drizzle syntax
    const items = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Test Laptop');
    expect(items[0].asset_code).toEqual('LAP001');
    expect(items[0].description).toEqual('Dell Latitude laptop for testing');
    expect(items[0].condition).toEqual('excellent');
    expect(items[0].storage_location).toEqual('IT Storage Room A');
    expect(items[0].quantity).toEqual(1);
    expect(items[0].created_at).toBeInstanceOf(Date);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create item with current_user_id when provided', async () => {
    // First create a user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    const inputWithUser: CreateItemInput = {
      ...testInput,
      current_user_id: user[0].id
    };

    const result = await createItem(inputWithUser);

    expect(result.current_user_id).toEqual(user[0].id);
  });

  it('should reject duplicate asset codes', async () => {
    // Create first item
    await createItem(testInput);

    // Try to create another item with same asset code
    const duplicateInput: CreateItemInput = {
      ...testInput,
      name: 'Different Name'
    };

    await expect(createItem(duplicateInput))
      .rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should handle different item conditions', async () => {
    const conditions = ['excellent', 'good', 'fair', 'poor', 'damaged'] as const;

    for (const condition of conditions) {
      const input: CreateItemInput = {
        name: `${condition} Item`,
        asset_code: `${condition.toUpperCase()}001`,
        condition,
        storage_location: 'Test Storage',
        quantity: 1
      };

      const result = await createItem(input);
      expect(result.condition).toEqual(condition);
    }
  });
});
