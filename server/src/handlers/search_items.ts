
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type SearchItemsInput, type Item } from '../schema';
import { eq, and, or, ilike, isNull, SQL } from 'drizzle-orm';

export const searchItems = async (input: SearchItemsInput): Promise<Item[]> => {
  try {
    const conditions: SQL<unknown>[] = [];

    // Text search on name and asset_code
    if (input.query) {
      conditions.push(
        or(
          ilike(itemsTable.name, `%${input.query}%`),
          ilike(itemsTable.asset_code, `%${input.query}%`)
        )!
      );
    }

    // Filter by condition
    if (input.condition) {
      conditions.push(eq(itemsTable.condition, input.condition));
    }

    // Filter by storage location
    if (input.storage_location) {
      conditions.push(eq(itemsTable.storage_location, input.storage_location));
    }

    // Filter for available items only (not currently borrowed)
    if (input.available_only) {
      conditions.push(isNull(itemsTable.current_user_id));
    }

    // Build and execute query
    const query = conditions.length > 0
      ? db.select().from(itemsTable).where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : db.select().from(itemsTable);

    const results = await query.execute();

    return results;
  } catch (error) {
    console.error('Item search failed:', error);
    throw error;
  }
};
