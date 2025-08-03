
import { db } from '../db';
import { itemsTable, usersTable } from '../db/schema';
import { type Item } from '../schema';
import { eq, isNull } from 'drizzle-orm';

export const getItemById = async (id: number): Promise<Item | null> => {
  try {
    // Query item with optional user join
    const results = await db.select({
      id: itemsTable.id,
      name: itemsTable.name,
      asset_code: itemsTable.asset_code,
      description: itemsTable.description,
      purchase_date: itemsTable.purchase_date,
      condition: itemsTable.condition,
      storage_location: itemsTable.storage_location,
      quantity: itemsTable.quantity,
      current_user_id: itemsTable.current_user_id,
      created_at: itemsTable.created_at,
      updated_at: itemsTable.updated_at,
      current_user: {
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        full_name: usersTable.full_name,
        role: usersTable.role,
        created_at: usersTable.created_at
      }
    })
    .from(itemsTable)
    .leftJoin(usersTable, eq(itemsTable.current_user_id, usersTable.id))
    .where(eq(itemsTable.id, id))
    .execute();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    
    // Return item data - current_user will be null if no user is assigned
    return {
      id: result.id,
      name: result.name,
      asset_code: result.asset_code,
      description: result.description,
      purchase_date: result.purchase_date,
      condition: result.condition,
      storage_location: result.storage_location,
      quantity: result.quantity,
      current_user_id: result.current_user_id,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  } catch (error) {
    console.error('Get item by ID failed:', error);
    throw error;
  }
};
