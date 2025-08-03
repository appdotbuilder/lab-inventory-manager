
import { db } from '../db';
import { itemsTable, usersTable } from '../db/schema';
import { type Item } from '../schema';
import { eq } from 'drizzle-orm';

export const getItems = async (): Promise<Item[]> => {
  try {
    // Get all items with optional current user information
    const results = await db.select()
      .from(itemsTable)
      .leftJoin(usersTable, eq(itemsTable.current_user_id, usersTable.id))
      .execute();

    // Map results to Item type, handling the joined structure
    return results.map(result => ({
      id: result.items.id,
      name: result.items.name,
      asset_code: result.items.asset_code,
      description: result.items.description,
      purchase_date: result.items.purchase_date,
      condition: result.items.condition,
      storage_location: result.items.storage_location,
      quantity: result.items.quantity,
      current_user_id: result.items.current_user_id,
      created_at: result.items.created_at,
      updated_at: result.items.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch items:', error);
    throw error;
  }
};
