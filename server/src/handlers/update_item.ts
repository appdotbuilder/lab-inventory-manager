
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type UpdateItemInput, type Item } from '../schema';
import { eq } from 'drizzle-orm';

export const updateItem = async (input: UpdateItemInput): Promise<Item> => {
  try {
    // Check if item exists
    const existingItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.id))
      .execute();

    if (existingItem.length === 0) {
      throw new Error(`Item with id ${input.id} not found`);
    }

    // Check asset_code uniqueness if it's being changed
    if (input.asset_code && input.asset_code !== existingItem[0].asset_code) {
      const assetCodeExists = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.asset_code, input.asset_code))
        .execute();

      if (assetCodeExists.length > 0) {
        throw new Error('Asset code already exists');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.asset_code !== undefined) updateData.asset_code = input.asset_code;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.purchase_date !== undefined) updateData.purchase_date = input.purchase_date;
    if (input.condition !== undefined) updateData.condition = input.condition;
    if (input.storage_location !== undefined) updateData.storage_location = input.storage_location;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.current_user_id !== undefined) updateData.current_user_id = input.current_user_id;

    // Update the item
    const result = await db.update(itemsTable)
      .set(updateData)
      .where(eq(itemsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Item update failed:', error);
    throw error;
  }
};
