
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user'
};

const adminInput: CreateUserInput = {
  username: 'adminuser',
  email: 'admin@example.com',
  full_name: 'Admin User',
  role: 'admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('user');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an admin user', async () => {
    const result = await createUser(adminInput);

    expect(result.username).toEqual('adminuser');
    expect(result.email).toEqual('admin@example.com');
    expect(result.full_name).toEqual('Admin User');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('user');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate username', async () => {
    await createUser(testInput);

    const duplicateUsernameInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      full_name: 'Different User',
      role: 'user'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/unique constraint/i);
  });

  it('should reject duplicate email', async () => {
    await createUser(testInput);

    const duplicateEmailInput: CreateUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      full_name: 'Different User',
      role: 'user'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique constraint/i);
  });

  it('should allow multiple users with different credentials', async () => {
    const user1 = await createUser(testInput);
    const user2 = await createUser(adminInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.username).not.toEqual(user2.username);
    expect(user1.email).not.toEqual(user2.email);

    // Verify both exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
  });
});
