
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, usersTable } from '../db/schema';
import { type UpdateItemInput, type CreateUserInput } from '../schema';
import { updateItem } from '../handlers/update_item';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user'
};

const testItem = {
  name: 'Test Item',
  asset_code: 'TEST001',
  description: 'A test item',
  purchase_date: new Date('2024-01-01'),
  condition: 'good' as const,
  storage_location: 'Room A',
  quantity: 5,
  current_user_id: null
};

describe('updateItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update item fields', async () => {
    // Create test item
    const [createdItem] = await db.insert(itemsTable)
      .values(testItem)
      .returning()
      .execute();

    const updateInput: UpdateItemInput = {
      id: createdItem.id,
      name: 'Updated Item',
      description: 'Updated description',
      condition: 'excellent',
      quantity: 10
    };

    const result = await updateItem(updateInput);

    expect(result.id).toEqual(createdItem.id);
    expect(result.name).toEqual('Updated Item');
    expect(result.description).toEqual('Updated description');
    expect(result.condition).toEqual('excellent');
    expect(result.quantity).toEqual(10);
    expect(result.asset_code).toEqual('TEST001'); // Unchanged
    expect(result.storage_location).toEqual('Room A'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdItem.updated_at.getTime());
  });

  it('should update only provided fields', async () => {
    // Create test item
    const [createdItem] = await db.insert(itemsTable)
      .values(testItem)
      .returning()
      .execute();

    const updateInput: UpdateItemInput = {
      id: createdItem.id,
      name: 'Only Name Updated'
    };

    const result = await updateItem(updateInput);

    expect(result.name).toEqual('Only Name Updated');
    expect(result.asset_code).toEqual('TEST001'); // Unchanged
    expect(result.description).toEqual('A test item'); // Unchanged
    expect(result.condition).toEqual('good'); // Unchanged
    expect(result.quantity).toEqual(5); // Unchanged
  });

  it('should update asset_code when unique', async () => {
    // Create test item
    const [createdItem] = await db.insert(itemsTable)
      .values(testItem)
      .returning()
      .execute();

    const updateInput: UpdateItemInput = {
      id: createdItem.id,
      asset_code: 'TEST002'
    };

    const result = await updateItem(updateInput);

    expect(result.asset_code).toEqual('TEST002');
  });

  it('should update current_user_id with valid user', async () => {
    // Create test user
    const [createdUser] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test item
    const [createdItem] = await db.insert(itemsTable)
      .values(testItem)
      .returning()
      .execute();

    const updateInput: UpdateItemInput = {
      id: createdItem.id,
      current_user_id: createdUser.id
    };

    const result = await updateItem(updateInput);

    expect(result.current_user_id).toEqual(createdUser.id);
  });

  it('should update current_user_id to null', async () => {
    // Create test user first
    const [createdUser] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test item with user assigned
    const [createdItem] = await db.insert(itemsTable)
      .values({
        ...testItem,
        current_user_id: createdUser.id
      })
      .returning()
      .execute();

    const updateInput: UpdateItemInput = {
      id: createdItem.id,
      current_user_id: null
    };

    const result = await updateItem(updateInput);

    expect(result.current_user_id).toBeNull();
  });

  it('should save changes to database', async () => {
    // Create test item
    const [createdItem] = await db.insert(itemsTable)
      .values(testItem)
      .returning()
      .execute();

    const updateInput: UpdateItemInput = {
      id: createdItem.id,
      name: 'Database Updated Item',
      quantity: 15
    };

    await updateItem(updateInput);

    // Verify changes were saved
    const savedItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, createdItem.id))
      .execute();

    expect(savedItem).toHaveLength(1);
    expect(savedItem[0].name).toEqual('Database Updated Item');
    expect(savedItem[0].quantity).toEqual(15);
  });

  it('should throw error when item does not exist', async () => {
    const updateInput: UpdateItemInput = {
      id: 999,
      name: 'Non-existent Item'
    };

    await expect(updateItem(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error when asset_code already exists', async () => {
    // Create first item
    await db.insert(itemsTable)
      .values(testItem)
      .returning()
      .execute();

    // Create second item
    const [secondItem] = await db.insert(itemsTable)
      .values({
        ...testItem,
        asset_code: 'TEST002'
      })
      .returning()
      .execute();

    // Try to update second item with first item's asset_code
    const updateInput: UpdateItemInput = {
      id: secondItem.id,
      asset_code: 'TEST001'
    };

    await expect(updateItem(updateInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow updating asset_code to same value', async () => {
    // Create test item
    const [createdItem] = await db.insert(itemsTable)
      .values(testItem)
      .returning()
      .execute();

    const updateInput: UpdateItemInput = {
      id: createdItem.id,
      asset_code: 'TEST001', // Same as current
      name: 'Updated Name'
    };

    const result = await updateItem(updateInput);

    expect(result.asset_code).toEqual('TEST001');
    expect(result.name).toEqual('Updated Name');
  });
});
