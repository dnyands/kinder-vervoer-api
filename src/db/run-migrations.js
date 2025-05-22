import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  try {
    const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'));
    
    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
        await db.query(sql);
        console.log(`Completed migration: ${file}`);
      }
    }
    
    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
