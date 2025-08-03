
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput, type Item } from '../schema';

export const createItem = async (input: CreateItemInput): Promise<Item> => {
  try {
    // Insert item record
    const result = await db.insert(itemsTable)
      .values({
        name: input.name,
        asset_code: input.asset_code,
        description: input.description || null,
        purchase_date: input.purchase_date || null,
        condition: input.condition,
        storage_location: input.storage_location,
        quantity: input.quantity,
        current_user_id: input.current_user_id || null
      })
      .returning()
      .execute();

    const item = result[0];
    return item;
  } catch (error) {
    console.error('Item creation failed:', error);
    throw error;
  }
};
