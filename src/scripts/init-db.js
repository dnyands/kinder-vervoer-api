import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeDatabase() {
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    logger.info('Starting database initialization...');

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      await db.query(statement + ';');
    }

    logger.info('Database initialization completed successfully');

    // Verify the users table structure
    const tableInfo = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );

    logger.info('Users table structure:', {
      columns: tableInfo.rows
    });

  } catch (error) {
    logger.error('Error initializing database:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await db.end();
  }
}

initializeDatabase().catch(console.error);
