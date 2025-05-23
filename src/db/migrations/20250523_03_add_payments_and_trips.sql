-- Add payment and subscription fields to drivers
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS license_expiry DATE,
ADD COLUMN IF NOT EXISTS registration_expiry DATE;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  payment_provider VARCHAR(20), -- 'stripe' or 'flutterwave'
  provider_payment_id VARCHAR(255),
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create payment subscriptions table
CREATE TABLE IF NOT EXISTS payment_subscriptions (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  provider_subscription_id VARCHAR(255),
  plan_name VARCHAR(100),
  status VARCHAR(20),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  driver_id INTEGER REFERENCES drivers(id),
  school_id INTEGER REFERENCES schools(id),
  trip_type VARCHAR(10) CHECK (trip_type IN ('pickup', 'dropoff')),
  status VARCHAR(20) DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- Store recurring schedule details
  parent_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indices
CREATE INDEX IF NOT EXISTS idx_payments_driver ON payments(driver_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_driver ON payment_subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_student ON trips(student_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_school ON trips(school_id);
CREATE INDEX IF NOT EXISTS idx_trips_scheduled ON trips(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- Create view for admin dashboard
CREATE OR REPLACE VIEW admin_dashboard_stats AS
WITH driver_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE is_active = true) as active_drivers,
    COUNT(*) FILTER (WHERE subscription_status = 'active') as subscribed_drivers,
    COUNT(*) FILTER (WHERE license_expiry < CURRENT_DATE + INTERVAL '30 days') as expiring_licenses,
    COUNT(*) as total_drivers
  FROM drivers
),
attendance_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE DATE(timestamp) = CURRENT_DATE) as today_pickups,
    COUNT(*) FILTER (WHERE DATE(timestamp) = CURRENT_DATE AND status = 'dropped_off') as today_dropoffs
  FROM student_attendance
),
rating_stats AS (
  SELECT 
    d.id as driver_id,
    d.user_id,
    u.first_name,
    u.last_name,
    ROUND(AVG(r.rating)::numeric, 1) as avg_rating,
    COUNT(r.id) as total_ratings
  FROM drivers d
  JOIN users u ON u.id = d.user_id
  LEFT JOIN driver_ratings r ON r.driver_id = d.id
  GROUP BY d.id, d.user_id, u.first_name, u.last_name
  ORDER BY avg_rating DESC
  LIMIT 5
)
SELECT 
  json_build_object(
    'drivers', json_build_object(
      'active', ds.active_drivers,
      'subscribed', ds.subscribed_drivers,
      'expiring_licenses', ds.expiring_licenses,
      'total', ds.total_drivers
    ),
    'attendance', json_build_object(
      'today_pickups', COALESCE(ast.today_pickups, 0),
      'today_dropoffs', COALESCE(ast.today_dropoffs, 0)
    ),
    'top_rated_drivers', (
      SELECT json_agg(
        json_build_object(
          'id', rs.driver_id,
          'name', rs.first_name || ' ' || rs.last_name,
          'rating', rs.avg_rating,
          'total_ratings', rs.total_ratings
        )
      )
      FROM rating_stats rs
    )
  ) as dashboard_stats
FROM driver_stats ds
CROSS JOIN attendance_stats ast;
