
import { db } from '../db';
import { itemsTable, borrowingHistoryTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteItem = async (id: number): Promise<boolean> => {
  try {
    // Check if item exists
    const existingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, id))
      .execute();

    if (existingItems.length === 0) {
      return false;
    }

    // Check if item has borrowing history - this would prevent deletion due to foreign key constraints
    const borrowingHistory = await db.select()
      .from(borrowingHistoryTable)
      .where(eq(borrowingHistoryTable.item_id, id))
      .execute();

    if (borrowingHistory.length > 0) {
      // Item has borrowing history, cannot delete due to foreign key constraint
      return false;
    }

    // Delete the item
    const result = await db.delete(itemsTable)
      .where(eq(itemsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Item deletion failed:', error);
    throw error;
  }
};
