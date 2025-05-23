-- Add required columns to students table if they don't exist
DO $$ 
BEGIN
  -- Add parent_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'students' 
    AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE students ADD COLUMN parent_id INTEGER REFERENCES users(id);
    CREATE INDEX idx_students_parent_id ON students(parent_id);
  END IF;

  -- Add driver_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'students' 
    AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE students ADD COLUMN driver_id INTEGER REFERENCES drivers(id);
    CREATE INDEX idx_students_driver_id ON students(driver_id);
  END IF;
END $$;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'students' 
    AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE students ADD COLUMN parent_id INTEGER REFERENCES users(id);
    CREATE INDEX idx_students_parent_id ON students(parent_id);
  END IF;
END $$;

-- Create schedule change requests table
DROP TABLE IF EXISTS schedule_change_requests CASCADE;

CREATE TABLE IF NOT EXISTS schedule_change_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_schedule JSONB,
  requested_schedule JSONB,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indices
CREATE INDEX IF NOT EXISTS idx_schedule_requests_student ON schedule_change_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_parent ON schedule_change_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON schedule_change_requests(status);

-- Add view for parent dashboard data
DROP VIEW IF EXISTS parent_dashboard_view CASCADE;

CREATE OR REPLACE VIEW parent_dashboard_view AS
SELECT 
  p.id as parent_id,
  s.id as student_id,
  s.first_name as student_first_name,
  s.last_name as student_last_name,
  s.school_id,
  sc.name as school_name,
  d.id as driver_id,
  du.first_name as driver_first_name,
  du.last_name as driver_last_name,
  d.vehicle_type,
  d.vehicle_model,
  d.license_plate,
  d.current_location_lat,
  d.current_location_lng,
  d.last_location_update,
  COALESCE(
    (SELECT json_build_object(
      'rating', ROUND(AVG(rating)::numeric, 1),
      'total_ratings', COUNT(*)
    )
    FROM driver_ratings
    WHERE driver_id = d.id
    GROUP BY driver_id
    ), 
    json_build_object('rating', 0, 'total_ratings', 0)
  ) as driver_rating,
  (SELECT json_agg(json_build_object(
    'id', doc.id,
    'type', doc.document_type,
    'status', doc.verification_status,
    'expires_at', doc.expires_at
  ))
  FROM driver_documents doc
  WHERE doc.driver_id = d.id
  AND doc.verification_status = 'verified'
  ) as driver_documents
FROM 
  users p
  JOIN students s ON s.parent_id = p.id
  LEFT JOIN schools sc ON s.school_id = sc.id
  LEFT JOIN drivers d ON s.driver_id = d.id
  LEFT JOIN users du ON d.user_id = du.id
WHERE 
  p.role = 'parent';
