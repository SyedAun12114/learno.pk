import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { pool } from './index';

async function run(): Promise<void> {
  console.log('Running migrations...');
  await pool.execute(
    'CREATE TABLE IF NOT EXISTS migrations (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, filename VARCHAR(255) NOT NULL, executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uk_migration (filename)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  );
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM migrations WHERE filename = ?', [file]
    );
    if ((rows as unknown[]).length) {
      console.log('  skip:', file);
      continue;
    }
    console.log('  run: ', file);
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const stmts = sql.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0 && !s.startsWith('--'));
    for (const stmt of stmts) {
      try {
        await pool.execute(stmt);
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') continue;
        throw e;
      }
    }
    await pool.execute('INSERT INTO migrations (filename) VALUES (?)', [file]);
    console.log('  done:', file);
  }
  console.log('Migrations complete.');
  await pool.end();
}

run().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
