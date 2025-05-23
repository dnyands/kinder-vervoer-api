import pkg from "pg";
import config from './config/index.js';

const { Pool } = pkg;

const pool = new Pool({
  user: 'danainyandoro',
  host: 'localhost',
  database: 'kinder_vervoer_api',
  password: '',
  port: 5432,
});

// Test the connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to database');
    done();
  }
});

export default pool;
