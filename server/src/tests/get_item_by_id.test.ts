
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, usersTable } from '../db/schema';
import { type CreateUserInput, type CreateItemInput } from '../schema';
import { getItemById } from '../handlers/get_item_by_id';

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user'
};

const testItem: CreateItemInput = {
  name: 'Test Laptop',
  asset_code: 'LAP001',
  description: 'MacBook Pro for testing',
  purchase_date: new Date('2023-01-15'),
  condition: 'excellent',
  storage_location: 'Office A',
  quantity: 1,
  current_user_id: null
};

describe('getItemById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return item when it exists', async () => {
    // Create test item
    const itemResults = await db.insert(itemsTable)
      .values({
        name: testItem.name,
        asset_code: testItem.asset_code,
        description: testItem.description,
        purchase_date: testItem.purchase_date,
        condition: testItem.condition,
        storage_location: testItem.storage_location,
        quantity: testItem.quantity,
        current_user_id: testItem.current_user_id
      })
      .returning()
      .execute();

    const createdItem = itemResults[0];
    const result = await getItemById(createdItem.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdItem.id);
    expect(result!.name).toEqual('Test Laptop');
    expect(result!.asset_code).toEqual('LAP001');
    expect(result!.description).toEqual('MacBook Pro for testing');
    expect(result!.condition).toEqual('excellent');
    expect(result!.storage_location).toEqual('Office A');
    expect(result!.quantity).toEqual(1);
    expect(result!.current_user_id).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return item with user data when assigned to user', async () => {
    // Create test user first
    const userResults = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        full_name: testUser.full_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const createdUser = userResults[0];

    // Create item assigned to user
    const itemResults = await db.insert(itemsTable)
      .values({
        name: testItem.name,
        asset_code: testItem.asset_code,
        description: testItem.description,
        purchase_date: testItem.purchase_date,
        condition: testItem.condition,
        storage_location: testItem.storage_location,
        quantity: testItem.quantity,
        current_user_id: createdUser.id
      })
      .returning()
      .execute();

    const createdItem = itemResults[0];
    const result = await getItemById(createdItem.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdItem.id);
    expect(result!.current_user_id).toEqual(createdUser.id);
    expect(result!.name).toEqual('Test Laptop');
    expect(result!.asset_code).toEqual('LAP001');
  });

  it('should return null when item does not exist', async () => {
    const result = await getItemById(999);
    expect(result).toBeNull();
  });

  it('should handle item with null description and purchase_date', async () => {
    // Create item with minimal data
    const itemResults = await db.insert(itemsTable)
      .values({
        name: 'Minimal Item',
        asset_code: 'MIN001',
        description: null,
        purchase_date: null,
        condition: 'good',
        storage_location: 'Storage B',
        quantity: 5,
        current_user_id: null
      })
      .returning()
      .execute();

    const createdItem = itemResults[0];
    const result = await getItemById(createdItem.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Minimal Item');
    expect(result!.description).toBeNull();
    expect(result!.purchase_date).toBeNull();
    expect(result!.quantity).toEqual(5);
  });

  it('should return correct data types', async () => {
    // Create test item
    const itemResults = await db.insert(itemsTable)
      .values({
        name: testItem.name,
        asset_code: testItem.asset_code,
        description: testItem.description,
        purchase_date: testItem.purchase_date,
        condition: testItem.condition,
        storage_location: testItem.storage_location,
        quantity: testItem.quantity,
        current_user_id: testItem.current_user_id
      })
      .returning()
      .execute();

    const createdItem = itemResults[0];
    const result = await getItemById(createdItem.id);

    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe('number');
    expect(typeof result!.name).toBe('string');
    expect(typeof result!.asset_code).toBe('string');
    expect(typeof result!.quantity).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});
