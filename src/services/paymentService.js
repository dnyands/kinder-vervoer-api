import Stripe from 'stripe';
import pool from '../db.js';
import config from '../config/index.js';
import { ValidationError } from '../utils/errors.js';

const stripe = new Stripe(config.stripe.secretKey);

class PaymentService {
  // Create or update Stripe customer
  async createOrUpdateCustomer(driver, user) {
    let stripeCustomerId = driver.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        metadata: {
          driverId: driver.id
        }
      });
      stripeCustomerId = customer.id;

      // Update driver with Stripe customer ID
      await pool.query(
        'UPDATE drivers SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomerId, driver.id]
      );
    }

    return stripeCustomerId;
  }

  // Create subscription checkout session
  async createSubscriptionSession(driverId) {
    const client = await pool.connect();
    try {
      // Get driver and user info
      const result = await client.query(
        `SELECT d.*, u.email, u.first_name, u.last_name 
         FROM drivers d 
         JOIN users u ON u.id = d.user_id 
         WHERE d.id = $1`,
        [driverId]
      );

      if (!result.rows.length) {
        throw new ValidationError('Driver not found');
      }

      const driver = result.rows[0];
      
      // Create or get Stripe customer
      const stripeCustomerId = await this.createOrUpdateCustomer(driver, {
        email: driver.email,
        first_name: driver.first_name,
        last_name: driver.last_name
      });

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price: config.stripe.subscriptionPriceId,
          quantity: 1,
        }],
        success_url: `${config.server.frontendUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.server.frontendUrl}/dashboard`,
        metadata: {
          driverId: driver.id
        }
      });

      return session;
    } finally {
      client.release();
    }
  }

  // Handle Stripe webhook events
  async handleWebhook(event) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const driverId = session.metadata.driverId;
          
          // Update subscription status
          await client.query(
            `UPDATE drivers 
             SET subscription_status = 'active',
                 subscription_end_date = NOW() + INTERVAL '1 month'
             WHERE id = $1`,
            [driverId]
          );

          // Record payment
          await client.query(
            `INSERT INTO payments (
              driver_id, amount, currency, payment_method,
              payment_provider, provider_payment_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              driverId,
              session.amount_total / 100,
              session.currency,
              'card',
              'stripe',
              session.payment_intent,
              'completed'
            ]
          );
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customer = await stripe.customers.retrieve(subscription.customer);
          const driverId = customer.metadata.driverId;

          await client.query(
            `UPDATE drivers 
             SET subscription_status = $1,
                 subscription_end_date = to_timestamp($2)
             WHERE id = $3`,
            [
              subscription.status === 'active' ? 'active' : 'inactive',
              subscription.current_period_end,
              driverId
            ]
          );
          break;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get payment history
  async getPaymentHistory(driverId) {
    const result = await pool.query(
      `SELECT * FROM payments 
       WHERE driver_id = $1 
       ORDER BY created_at DESC`,
      [driverId]
    );

    return result.rows;
  }
}

export default new PaymentService();
