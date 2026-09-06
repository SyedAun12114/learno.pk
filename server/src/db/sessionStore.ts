import session from 'express-session';
import mysql from 'mysql2/promise';
import { pool } from './index';

const Store = session.Store;

export class MySQLSessionStore extends Store {
  constructor() {
    super();
    setInterval(() => this.cleanExpired(), 60 * 60 * 1000);
  }

  private async cleanExpired(): Promise<void> {
    try {
      await pool.execute('DELETE FROM user_sessions WHERE expires < NOW()');
    } catch {
      // silent
    }
  }

  get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {
    pool.execute<mysql.RowDataPacket[]>(
      'SELECT data, expires FROM user_sessions WHERE sid = ?',
      [sid]
    ).then(([rows]) => {
      if (!rows.length) return callback(null, null);
      const row = rows[0];
      if (new Date(row.expires as string) < new Date()) return callback(null, null);
      try {
        callback(null, JSON.parse(row.data as string));
      } catch {
        callback(null, null);
      }
    }).catch(callback);
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): void {
    const expires = sessionData.cookie.expires
      ? new Date(sessionData.cookie.expires)
      : new Date(Date.now() + 86400000);
    pool.execute(
      'INSERT INTO user_sessions (sid, data, expires) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)',
      [sid, JSON.stringify(sessionData), expires]
    ).then(() => callback?.()).catch(callback);
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    pool.execute('DELETE FROM user_sessions WHERE sid = ?', [sid])
      .then(() => callback?.())
      .catch(callback);
  }
}
