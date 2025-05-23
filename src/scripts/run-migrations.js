import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const { rows: executed } = await client.query(
      'SELECT name FROM migrations'
    );
    const executedFiles = new Set(executed.map(r => r.name));

    // Run pending migrations
    for (const file of files) {
      if (!executedFiles.has(file)) {
        logger.info(`Running migration: ${file}`);
        
        const sql = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8'
        );

        await client.query('BEGIN');
        
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          
          logger.info(`Migration completed: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations().then(() => {
  logger.info('Migration script completed');
  process.exit(0);
});
