-- Create driver routes table
CREATE TABLE IF NOT EXISTS driver_routes (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  route_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  student_ids INTEGER[] NOT NULL,
  route_data JSONB NOT NULL,
  estimated_duration INTEGER, -- in seconds
  estimated_distance INTEGER, -- in meters
  waypoints JSONB NOT NULL,
  polyline TEXT,
  last_generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_driver_routes_driver_id ON driver_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_routes_school_id ON driver_routes(school_id);
CREATE INDEX IF NOT EXISTS idx_driver_routes_is_active ON driver_routes(is_active);

-- Create route history table for tracking changes
CREATE TABLE IF NOT EXISTS route_history (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES driver_routes(id) ON DELETE CASCADE,
  change_type VARCHAR(20) NOT NULL, -- 'created', 'updated', 'deactivated'
  previous_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add function to update route history
CREATE OR REPLACE FUNCTION log_route_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO route_history (route_id, change_type, new_data)
    VALUES (NEW.id, 'created', row_to_json(NEW)::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO route_history (route_id, change_type, previous_data, new_data)
    VALUES (NEW.id, 'updated', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for route history
CREATE TRIGGER route_history_trigger
AFTER INSERT OR UPDATE ON driver_routes
FOR EACH ROW
EXECUTE FUNCTION log_route_change();
