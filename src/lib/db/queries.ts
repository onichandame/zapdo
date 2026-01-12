import type { User, Task, TaskWithContent, EncryptionKeys, PaginationParams, PaginatedResponse, ApiResponse } from '$lib/types';

export function getUserById(db: D1Database, id: number): Promise<D1Result<User> | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

export function createUser(db: D1Database): Promise<D1Result<User>> {
  return db.prepare('INSERT INTO users (created_at) VALUES (datetime(\'now\')) RETURNING *').run();
}

export function getEncryptionKeys(db: D1Database, userId: number): Promise<D1Result<EncryptionKeys> | null> {
  return db.prepare('SELECT * FROM encryption_keys WHERE user_id = ?').bind(userId).first();
}

export function createEncryptionKeys(
  db: D1Database,
  userId: number,
  encryptedDek: string,
  salt: string,
  publicKey: string,
  privateKey: string
): Promise<D1Result<EncryptionKeys>> {
  return db.prepare(`
    INSERT INTO encryption_keys (user_id, encrypted_dek, salt, public_key, private_key, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    RETURNING *
  `).bind(userId, encryptedDek, salt, publicKey, privateKey).run();
}

export function getTasks(
  db: D1Database,
  userId: number,
  params: PaginationParams = {}
): Promise<D1Result<Task[]>> {
  let query = 'SELECT * FROM tasks WHERE user_id = ?';
  const bindings: any[] = [userId];

  if (params.importance_min !== undefined) {
    query += ' AND importance >= ?';
    bindings.push(params.importance_min);
  }
  if (params.importance_max !== undefined) {
    query += ' AND importance <= ?';
    bindings.push(params.importance_max);
  }
  if (params.urgency_min !== undefined) {
    query += ' AND urgency >= ?';
    bindings.push(params.urgency_min);
  }
  if (params.urgency_max !== undefined) {
    query += ' AND urgency <= ?';
    bindings.push(params.urgency_max);
  }

  query += ' ORDER BY created_at DESC';

  if (params.limit) {
    query += ' LIMIT ?';
    bindings.push(params.limit);
  }

  if (params.cursor) {
    query += ' OFFSET ?';
    bindings.push(params.cursor);
  }

  return db.prepare(query).bind(...bindings).all();
}

export function createTask(
  db: D1Database,
  userId: number,
  importance: number,
  urgency: number,
  hasContent: number = 1
): Promise<D1Result<Task>> {
  return db.prepare(`
    INSERT INTO tasks (user_id, importance, urgency, has_content, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    RETURNING *
  `).bind(userId, importance, urgency, hasContent).run();
}

export function updateTask(
  db: D1Database,
  taskId: number,
  importance?: number,
  urgency?: number,
  hasContent?: number
): Promise<D1Result<Task>> {
  const updates: string[] = ['updated_at = datetime(\'now\')'];
  const bindings: any[] = [];

  if (importance !== undefined) {
    updates.push('importance = ?');
    bindings.push(importance);
  }
  if (urgency !== undefined) {
    updates.push('urgency = ?');
    bindings.push(urgency);
  }
  if (hasContent !== undefined) {
    updates.push('has_content = ?');
    bindings.push(hasContent);
  }

  bindings.push(taskId);

  return db.prepare(`
    UPDATE tasks SET ${updates.join(', ')} WHERE id = ? RETURNING *
  `).bind(...bindings).run();
}

export function deleteTask(db: D1Database, taskId: number): Promise<D1Result> {
  return db.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
}

export function getDanglingTasks(db: D1Database): Promise<D1Result<Task[]>> {
  return db.prepare(`
    SELECT * FROM tasks WHERE has_content = 0 ORDER BY created_at DESC
  `).all();
}

export function refreshDanglingFlag(db: D1Database): Promise<D1Result> {
  return db.prepare(`
    UPDATE tasks 
    SET has_content = 0
    WHERE id NOT IN (
      SELECT DISTINCT CAST(SUBSTR(key, 9) AS INTEGER)
      FROM (
        SELECT key FROM sqlite_master WHERE type='table'
      )
    )
  `).run();
}