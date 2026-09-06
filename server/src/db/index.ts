import mysql from 'mysql2/promise';
import { config } from '../config';
import { logger } from '../utils/logger';

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  timezone: '+00:00',
});

export async function testConnection(): Promise<void> {
  try {
    const conn = await pool.getConnection();
    conn.release();
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Database connection failed:', err);
    throw err;
  }
}
