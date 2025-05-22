import bcrypt from 'bcrypt';
import db from '../db.js';
import logger from '../utils/logger.js';

const mockData = {
  // Admin and driver users

  users: [
    // Admin user

    {
      email: 'admin@example.com',
      password_hash: 'admin123',
      role: 'admin',
      full_name: 'Admin User',
      phone_number: '+27123456789'
    },
    {
      email: 'driver1@example.com',
      password_hash: 'driver123',
      role: 'driver',
      full_name: 'John Driver',
      phone_number: '+27123456790'
    },
    {
      email: 'driver2@example.com',
      password_hash: 'driver123',
      role: 'driver',
      full_name: 'Jane Driver',
      phone_number: '+27123456791'
    }
  ],
  // Vehicle and license information for drivers
  drivers: [
    {
      name: 'John Driver',
      vehicle_type: 'Minibus',
      vehicle_registration: 'ABC123GP',
      license_number: 'DL123456',
      contact_number: '+27123456790',
      subscription_status: 'active'
    },
    {
      name: 'Jane Driver',
      vehicle_type: 'Van',
      vehicle_registration: 'DEF456GP',
      license_number: 'DL789012',
      contact_number: '+27123456791',
      subscription_status: 'active'
    }
  ],
  // Fee periods for the next three months
  fee_periods: [
    {
      name: 'May 2025',
      start_date: '2025-05-01',
      end_date: '2025-05-31'
    },
    {
      name: 'June 2025',
      start_date: '2025-06-01',
      end_date: '2025-06-30'
    },
    {
      name: 'July 2025',
      start_date: '2025-07-01',
      end_date: '2025-07-31'
    }
  ]
};

async function insertMockData() {
  try {
    // Clear existing data
    await db.query('TRUNCATE users, drivers, fee_periods, accounts, driver_subscriptions CASCADE');
    logger.info('Cleared existing data');

    // Insert users
    for (const user of mockData.users) {
      const hashedPassword = await bcrypt.hash(user.password_hash, 10);
      const result = await db.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone_number) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.email, hashedPassword, user.role, user.full_name, user.phone_number]
      );
      logger.info(`Created user: ${user.email}`);

      // If user is a driver, create driver record
      if (user.role === 'driver') {
        const driverData = mockData.drivers.find(d => d.name === user.full_name);
        if (driverData) {
          await db.query(
            `INSERT INTO drivers (user_id, name, vehicle_type, vehicle_registration, 
             license_number, contact_number, subscription_status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              result.rows[0].id,
              driverData.name,
              driverData.vehicle_type,
              driverData.vehicle_registration,
              driverData.license_number,
              driverData.contact_number,
              driverData.subscription_status
            ]
          );
          logger.info(`Created driver: ${driverData.name}`);
        }
      }
    }

    // Insert fee periods
    for (const period of mockData.fee_periods) {
      await db.query(
        'INSERT INTO fee_periods (name, start_date, end_date) VALUES ($1, $2, $3)',
        [period.name, period.start_date, period.end_date]
      );
      logger.info(`Created fee period: ${period.name}`);
    }

    // Create driver accounts and subscriptions
    const drivers = await db.query('SELECT id FROM drivers');
    const feePeriods = await db.query('SELECT id FROM fee_periods');

    for (const driver of drivers.rows) {
      // Create accounts for each fee period
      const userResult = await db.query('SELECT user_id FROM drivers WHERE id = $1', [driver.id]);
      if (userResult.rows.length > 0) {
        for (const period of feePeriods.rows) {
          await db.query(
            `INSERT INTO accounts 
             (user_id, fee_period_id, amount_charged, payment_due_date, payment_status) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userResult.rows[0].user_id, period.id, 500.00, '2025-05-31', 'pending']
          );
        }
        logger.info(`Created accounts for user ID: ${userResult.rows[0].user_id}`);
      }

      // Create driver subscription
      await db.query(
        `INSERT INTO driver_subscriptions 
         (driver_id, subscription_type, amount, start_date, end_date, status) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [driver.id, 'monthly', 100.00, '2025-05-01', '2025-05-31', 'active']
      );
      logger.info(`Created subscription for driver ID: ${driver.id}`);
    }

    logger.info('Mock data insertion completed successfully');
  } catch (error) {
    logger.error('Error inserting mock data:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  insertMockData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed to insert mock data:', error);
      process.exit(1);
    });
}

export default insertMockData;
