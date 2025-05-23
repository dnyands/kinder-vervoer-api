-- Create enum for attendance status
CREATE TYPE attendance_status AS ENUM ('picked_up', 'dropped_off', 'missed');

-- Create attendance table
CREATE TABLE IF NOT EXISTS student_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status attendance_status NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_driver_id ON student_attendance(driver_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON student_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON student_attendance(timestamp);

-- Create view for daily attendance summary
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT 
  student_id,
  driver_id,
  school_id,
  DATE(timestamp) as date,
  BOOL_OR(status = 'picked_up') as was_picked_up,
  BOOL_OR(status = 'dropped_off') as was_dropped_off,
  BOOL_OR(status = 'missed') as was_missed
FROM student_attendance
GROUP BY student_id, driver_id, school_id, DATE(timestamp);

-- Function to validate student assignment to driver
CREATE OR REPLACE FUNCTION validate_student_driver_assignment(
  p_student_id INTEGER,
  p_driver_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM student_driver_assignments
    WHERE student_id = p_student_id 
    AND driver_id = p_driver_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;
