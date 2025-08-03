
import { db } from '../db';
import { itemsTable, borrowingHistoryTable, usersTable } from '../db/schema';
import { type CreateBorrowingInput, type BorrowingHistory } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const borrowItem = async (input: CreateBorrowingInput): Promise<BorrowingHistory> => {
  try {
    // First, validate that the borrower exists
    const borrower = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.borrower_id))
      .limit(1)
      .execute();

    if (borrower.length === 0) {
      throw new Error(`Borrower with ID ${input.borrower_id} does not exist`);
    }

    // Validate that the item exists and is available
    const item = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.item_id))
      .limit(1)
      .execute();

    if (item.length === 0) {
      throw new Error(`Item with ID ${input.item_id} does not exist`);
    }

    // Check if item is already borrowed (current_user_id is not null)
    if (item[0].current_user_id !== null) {
      throw new Error(`Item with ID ${input.item_id} is already borrowed`);
    }

    // Create borrowing history record
    const borrowingResult = await db.insert(borrowingHistoryTable)
      .values({
        item_id: input.item_id,
        borrower_id: input.borrower_id,
        expected_return_date: input.expected_return_date,
        notes: input.notes || null,
        status: 'borrowed'
      })
      .returning()
      .execute();

    // Update item's current_user_id to mark it as borrowed
    await db.update(itemsTable)
      .set({
        current_user_id: input.borrower_id,
        updated_at: new Date()
      })
      .where(eq(itemsTable.id, input.item_id))
      .execute();

    return borrowingResult[0];
  } catch (error) {
    console.error('Borrow item failed:', error);
    throw error;
  }
};
