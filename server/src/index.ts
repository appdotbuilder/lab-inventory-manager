
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createItemInputSchema, 
  updateItemInputSchema, 
  searchItemsInputSchema,
  createBorrowingInputSchema,
  returnItemInputSchema,
  createUserInputSchema
} from './schema';

// Import handlers
import { createItem } from './handlers/create_item';
import { getItems } from './handlers/get_items';
import { getItemById } from './handlers/get_item_by_id';
import { updateItem } from './handlers/update_item';
import { deleteItem } from './handlers/delete_item';
import { searchItems } from './handlers/search_items';
import { borrowItem } from './handlers/borrow_item';
import { returnItem } from './handlers/return_item';
import { getBorrowingHistory } from './handlers/get_borrowing_history';
import { getOverdueItems } from './handlers/get_overdue_items';
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Item management routes
  createItem: publicProcedure
    .input(createItemInputSchema)
    .mutation(({ input }) => createItem(input)),
  
  getItems: publicProcedure
    .query(() => getItems()),
  
  getItemById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getItemById(input.id)),
  
  updateItem: publicProcedure
    .input(updateItemInputSchema)
    .mutation(({ input }) => updateItem(input)),
  
  deleteItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteItem(input.id)),
  
  searchItems: publicProcedure
    .input(searchItemsInputSchema)
    .query(({ input }) => searchItems(input)),

  // Borrowing management routes
  borrowItem: publicProcedure
    .input(createBorrowingInputSchema)
    .mutation(({ input }) => borrowItem(input)),
  
  returnItem: publicProcedure
    .input(returnItemInputSchema)
    .mutation(({ input }) => returnItem(input)),
  
  getBorrowingHistory: publicProcedure
    .input(z.object({ itemId: z.number().optional() }))
    .query(({ input }) => getBorrowingHistory(input.itemId)),
  
  getOverdueItems: publicProcedure
    .query(() => getOverdueItems()),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
