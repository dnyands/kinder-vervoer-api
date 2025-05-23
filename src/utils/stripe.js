import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const verifySubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return {
      active: subscription.status === 'active',
      type: subscription.items.data[0].price.nickname || 'standard',
      amount: subscription.items.data[0].price.unit_amount / 100,
      startDate: new Date(subscription.current_period_start * 1000),
      endDate: new Date(subscription.current_period_end * 1000)
    };
  } catch (error) {
    console.error('Stripe verification error:', error);
    throw new Error('Failed to verify subscription');
  }
};
