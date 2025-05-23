-- Create ratings table
CREATE TABLE IF NOT EXISTS driver_ratings (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one rating per parent-driver combination
  UNIQUE(driver_id, parent_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON driver_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_parent_id ON driver_ratings(parent_id);

-- Create a view for driver average ratings
CREATE OR REPLACE VIEW driver_average_ratings AS
SELECT 
  driver_id,
  ROUND(AVG(rating)::numeric, 2) as average_rating,
  COUNT(*) as total_ratings
FROM driver_ratings
GROUP BY driver_id;

-- Function to check if a parent can rate a driver
CREATE OR REPLACE FUNCTION can_parent_rate_driver(p_parent_id INTEGER, p_driver_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM student_driver_assignments sda
    JOIN students s ON s.id = sda.student_id
    WHERE s.parent_id = p_parent_id 
    AND sda.driver_id = p_driver_id
  );
END;
$$ LANGUAGE plpgsql;
