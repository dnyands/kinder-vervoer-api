-- Add GPS logs table
CREATE TABLE gps_logs (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2),
  heading INTEGER,
  accuracy DECIMAL(5, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indices for efficient querying
CREATE INDEX idx_gps_logs_driver_id ON gps_logs(driver_id);
CREATE INDEX idx_gps_logs_trip_id ON gps_logs(trip_id);
CREATE INDEX idx_gps_logs_timestamp ON gps_logs(timestamp);
CREATE INDEX idx_gps_logs_location ON gps_logs(lat, lng);

-- Create materialized view for heatmap data
CREATE MATERIALIZED VIEW driver_location_heatmap AS
SELECT 
  driver_id,
  ROUND(lat::numeric, 4) as lat_group,
  ROUND(lng::numeric, 4) as lng_group,
  COUNT(*) as weight,
  DATE_TRUNC('hour', timestamp) as time_group
FROM gps_logs
GROUP BY 
  driver_id,
  lat_group,
  lng_group,
  time_group;

-- Add indices to materialized view
CREATE INDEX idx_heatmap_driver_time ON driver_location_heatmap(driver_id, time_group);
CREATE INDEX idx_heatmap_location ON driver_location_heatmap(lat_group, lng_group);

-- Create function to refresh heatmap
CREATE OR REPLACE FUNCTION refresh_heatmap()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY driver_location_heatmap;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh heatmap
CREATE TRIGGER refresh_heatmap_trigger
AFTER INSERT OR UPDATE OR DELETE ON gps_logs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_heatmap();
