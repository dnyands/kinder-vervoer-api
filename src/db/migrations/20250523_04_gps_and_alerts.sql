-- Add language preference to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Create GPS logs table
CREATE TABLE IF NOT EXISTS gps_logs (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2),
  heading INTEGER,
  accuracy DECIMAL(6, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  trip_id INTEGER REFERENCES trips(id)
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB,
  driver_id INTEGER REFERENCES drivers(id),
  trip_id INTEGER REFERENCES trips(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by INTEGER REFERENCES users(id)
);

-- Create alert subscriptions table
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  alert_types TEXT[],
  notification_channels TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create materialized view for heatmap data
CREATE MATERIALIZED VIEW gps_heatmap AS
WITH clustered_points AS (
  SELECT 
    driver_id,
    ROUND(lat::numeric, 4) as lat_group,
    ROUND(lng::numeric, 4) as lng_group,
    DATE_TRUNC('hour', timestamp) as time_group,
    COUNT(*) as point_count
  FROM gps_logs
  GROUP BY 
    driver_id,
    ROUND(lat::numeric, 4),
    ROUND(lng::numeric, 4),
    DATE_TRUNC('hour', timestamp)
)
SELECT 
  driver_id,
  lat_group as lat,
  lng_group as lng,
  time_group as timestamp,
  point_count as weight
FROM clustered_points;

-- Create indices
CREATE INDEX idx_gps_logs_driver ON gps_logs(driver_id);
CREATE INDEX idx_gps_logs_trip ON gps_logs(trip_id);
CREATE INDEX idx_gps_logs_timestamp ON gps_logs(timestamp);
CREATE INDEX idx_alerts_driver ON alerts(driver_id);
CREATE INDEX idx_alerts_trip ON alerts(trip_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alert_subs_user ON alert_subscriptions(user_id);

-- Create function to refresh heatmap
CREATE OR REPLACE FUNCTION refresh_heatmap()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY gps_heatmap;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh heatmap
CREATE TRIGGER refresh_heatmap_trigger
AFTER INSERT OR UPDATE OR DELETE ON gps_logs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_heatmap();
