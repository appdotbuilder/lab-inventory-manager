
import { db } from '../db';
import { borrowingHistoryTable, itemsTable } from '../db/schema';
import { type ReturnItemInput, type BorrowingHistory } from '../schema';
import { eq } from 'drizzle-orm';

export const returnItem = async (input: ReturnItemInput): Promise<BorrowingHistory> => {
  try {
    // First, get the borrowing record to verify it exists and get item_id
    const borrowingRecords = await db.select()
      .from(borrowingHistoryTable)
      .where(eq(borrowingHistoryTable.id, input.borrowing_id))
      .execute();

    if (borrowingRecords.length === 0) {
      throw new Error(`Borrowing record with id ${input.borrowing_id} not found`);
    }

    const borrowingRecord = borrowingRecords[0];

    // Check if already returned
    if (borrowingRecord.status === 'returned') {
      throw new Error('Item has already been returned');
    }

    // Update borrowing history record with return information
    const updatedBorrowingRecords = await db.update(borrowingHistoryTable)
      .set({
        actual_return_date: new Date(),
        status: 'returned',
        notes: input.notes || borrowingRecord.notes
      })
      .where(eq(borrowingHistoryTable.id, input.borrowing_id))
      .returning()
      .execute();

    // Clear the item's current_user_id to mark it as available
    await db.update(itemsTable)
      .set({
        current_user_id: null,
        updated_at: new Date()
      })
      .where(eq(itemsTable.id, borrowingRecord.item_id))
      .execute();

    return updatedBorrowingRecords[0];
  } catch (error) {
    console.error('Item return failed:', error);
    throw error;
  }
};
