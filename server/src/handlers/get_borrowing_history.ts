
import { db } from '../db';
import { borrowingHistoryTable, itemsTable, usersTable } from '../db/schema';
import { type BorrowingHistory } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getBorrowingHistory = async (itemId?: number): Promise<BorrowingHistory[]> => {
  try {
    // Build the base selection fields
    const selectFields = {
      id: borrowingHistoryTable.id,
      item_id: borrowingHistoryTable.item_id,
      borrower_id: borrowingHistoryTable.borrower_id,
      borrowed_date: borrowingHistoryTable.borrowed_date,
      expected_return_date: borrowingHistoryTable.expected_return_date,
      actual_return_date: borrowingHistoryTable.actual_return_date,
      status: borrowingHistoryTable.status,
      notes: borrowingHistoryTable.notes,
      created_at: borrowingHistoryTable.created_at
    };

    let results;

    if (itemId !== undefined) {
      // Query with item filter
      results = await db.select(selectFields)
        .from(borrowingHistoryTable)
        .innerJoin(itemsTable, eq(borrowingHistoryTable.item_id, itemsTable.id))
        .innerJoin(usersTable, eq(borrowingHistoryTable.borrower_id, usersTable.id))
        .where(eq(borrowingHistoryTable.item_id, itemId))
        .orderBy(desc(borrowingHistoryTable.created_at))
        .execute();
    } else {
      // Query without filter
      results = await db.select(selectFields)
        .from(borrowingHistoryTable)
        .innerJoin(itemsTable, eq(borrowingHistoryTable.item_id, itemsTable.id))
        .innerJoin(usersTable, eq(borrowingHistoryTable.borrower_id, usersTable.id))
        .orderBy(desc(borrowingHistoryTable.created_at))
        .execute();
    }

    return results;
  } catch (error) {
    console.error('Get borrowing history failed:', error);
    throw error;
  }
};
