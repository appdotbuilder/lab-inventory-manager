
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test users data
const testUsers: CreateUserInput[] = [
  {
    username: 'admin_user',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin'
  },
  {
    username: 'regular_user',
    email: 'user@example.com',
    full_name: 'Regular User',
    role: 'user'
  },
  {
    username: 'another_user',
    email: 'another@example.com',
    full_name: 'Another User',
    role: 'user'
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users', async () => {
    // Create test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check that all users are returned
    const usernames = result.map(user => user.username);
    expect(usernames).toContain('admin_user');
    expect(usernames).toContain('regular_user');
    expect(usernames).toContain('another_user');
  });

  it('should return users with correct structure', async () => {
    // Create single test user
    await db.insert(usersTable)
      .values([testUsers[0]])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    // Verify all required fields are present
    expect(user.id).toBeDefined();
    expect(user.username).toEqual('admin_user');
    expect(user.email).toEqual('admin@example.com');
    expect(user.full_name).toEqual('Admin User');
    expect(user.role).toEqual('admin');
    expect(user.created_at).toBeInstanceOf(Date);
  });

  it('should return users ordered by creation time', async () => {
    // Create users one by one to ensure different timestamps
    for (const user of testUsers) {
      await db.insert(usersTable)
        .values([user])
        .execute();
    }

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify timestamps are in chronological order (oldest first)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].created_at >= result[i-1].created_at).toBe(true);
    }
  });
});
