import pkg from 'pg';
import config from '../config/index.js';

const { Client } = pkg;

async function createDatabase() {
  // Connect to postgres database to create our app database
  const client = new Client({
    user: config.db.user,
    password: config.db.password,
    host: config.db.host,
    port: config.db.port,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();
    
    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.db.database]
    );

    if (result.rows.length === 0) {
      // Create database if it doesn't exist
      await client.query(`CREATE DATABASE ${config.db.database}`);
      console.log(`Database ${config.db.database} created successfully`);
    } else {
      console.log(`Database ${config.db.database} already exists`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase().then(() => {
  console.log('Database creation script completed');
  process.exit(0);
});
