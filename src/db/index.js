import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'danainyandoro',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kinder_vervoer_api',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to run queries
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

export const db = {
  query,
  pool,
};

// Test the connection
pool.query('SELECT NOW()')
  .then(() => console.log('Successfully connected to database'))
  .catch(err => console.error('Error connecting to the database:', err));
