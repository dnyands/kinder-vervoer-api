-- Add location fields to drivers table
ALTER TABLE drivers
ADD COLUMN province VARCHAR(50),
ADD COLUMN town VARCHAR(100),
ADD COLUMN coordinates JSONB;

-- Add location fields to schools table
ALTER TABLE schools
ADD COLUMN province VARCHAR(50),
ADD COLUMN town VARCHAR(100),
ADD COLUMN coordinates JSONB;

-- Add location fields to students table
ALTER TABLE students
ADD COLUMN province VARCHAR(50),
ADD COLUMN town VARCHAR(100),
ADD COLUMN coordinates JSONB;

-- Add indices for fast querying
CREATE INDEX idx_drivers_province ON drivers(province);
CREATE INDEX idx_drivers_town ON drivers(town);
CREATE INDEX idx_drivers_coordinates ON drivers USING GIN(coordinates);

CREATE INDEX idx_schools_province ON schools(province);
CREATE INDEX idx_schools_town ON schools(town);
CREATE INDEX idx_schools_coordinates ON schools USING GIN(coordinates);

CREATE INDEX idx_students_province ON students(province);
CREATE INDEX idx_students_town ON students(town);
CREATE INDEX idx_students_coordinates ON students USING GIN(coordinates);

-- Create analytics views
CREATE MATERIALIZED VIEW analytics_driver_count_by_province AS
SELECT 
  province,
  COUNT(*) as driver_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_driver_count
FROM drivers
WHERE province IS NOT NULL
GROUP BY province;

CREATE MATERIALIZED VIEW analytics_student_count_by_town AS
SELECT 
  province,
  town,
  COUNT(*) as student_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_student_count
FROM students
WHERE town IS NOT NULL
GROUP BY province, town;

CREATE MATERIALIZED VIEW analytics_trip_metrics AS
SELECT
  DATE_TRUNC('day', completed_at) as date,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_duration_minutes,
  COUNT(*) as total_trips,
  COUNT(CASE 
    WHEN completed_at <= scheduled_pickup_time + INTERVAL '5 minutes' 
    THEN 1 
  END)::FLOAT / COUNT(*)::FLOAT * 100 as ontime_percentage
FROM trips
WHERE status = 'completed'
GROUP BY DATE_TRUNC('day', completed_at);

-- Create functions to refresh analytics
CREATE OR REPLACE FUNCTION refresh_analytics()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_driver_count_by_province;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_student_count_by_town;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_trip_metrics;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh analytics
CREATE TRIGGER refresh_driver_analytics
AFTER INSERT OR UPDATE OR DELETE ON drivers
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_analytics();

CREATE TRIGGER refresh_student_analytics
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_analytics();

CREATE TRIGGER refresh_trip_analytics
AFTER INSERT OR UPDATE OR DELETE ON trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_analytics();
