
import { db } from '../db';
import { borrowingHistoryTable, itemsTable, usersTable } from '../db/schema';
import { type BorrowingHistory } from '../schema';
import { and, eq, isNull, lt } from 'drizzle-orm';

export const getOverdueItems = async (): Promise<BorrowingHistory[]> => {
  try {
    const currentDate = new Date();
    
    // Query for overdue borrowing records with item and borrower information
    const results = await db.select({
      id: borrowingHistoryTable.id,
      item_id: borrowingHistoryTable.item_id,
      borrower_id: borrowingHistoryTable.borrower_id,
      borrowed_date: borrowingHistoryTable.borrowed_date,
      expected_return_date: borrowingHistoryTable.expected_return_date,
      actual_return_date: borrowingHistoryTable.actual_return_date,
      status: borrowingHistoryTable.status,
      notes: borrowingHistoryTable.notes,
      created_at: borrowingHistoryTable.created_at
    })
    .from(borrowingHistoryTable)
    .innerJoin(itemsTable, eq(borrowingHistoryTable.item_id, itemsTable.id))
    .innerJoin(usersTable, eq(borrowingHistoryTable.borrower_id, usersTable.id))
    .where(
      and(
        lt(borrowingHistoryTable.expected_return_date, currentDate),
        isNull(borrowingHistoryTable.actual_return_date)
      )
    )
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch overdue items:', error);
    throw error;
  }
};
