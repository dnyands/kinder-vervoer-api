-- Drop existing tables if they exist
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS schedule_change_requests CASCADE;

-- Create students table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  address TEXT,
  parent_id INTEGER REFERENCES users(id),
  driver_id INTEGER REFERENCES drivers(id),
  school_id INTEGER REFERENCES schools(id),
  pickup_address TEXT,
  dropoff_address TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indices
CREATE INDEX idx_students_parent_id ON students(parent_id);
CREATE INDEX idx_students_driver_id ON students(driver_id);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_is_active ON students(is_active);

-- Create schedule change requests table
CREATE TABLE schedule_change_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_schedule JSONB,
  requested_schedule JSONB,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indices
CREATE INDEX idx_schedule_requests_student ON schedule_change_requests(student_id);
CREATE INDEX idx_schedule_requests_parent ON schedule_change_requests(parent_id);
CREATE INDEX idx_schedule_requests_status ON schedule_change_requests(status);
