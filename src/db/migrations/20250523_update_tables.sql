-- Add vehicle_capacity to drivers if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'drivers' AND column_name = 'vehicle_capacity') THEN
        ALTER TABLE drivers ADD COLUMN vehicle_capacity INTEGER NOT NULL DEFAULT 10 CHECK (vehicle_capacity > 0);
    END IF;
END $$;

-- Create vehicle_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicle_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create routes table if it doesn't exist
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  direction route_direction NOT NULL,
  route_points JSONB NOT NULL,
  optimized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create route_students table if it doesn't exist
CREATE TABLE IF NOT EXISTS route_students (
  route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  pickup_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (route_id, student_id)
);

-- Create attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  recorded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, date)
);

-- Add indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vehicle_documents_driver_id') THEN
        CREATE INDEX idx_vehicle_documents_driver_id ON vehicle_documents(driver_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vehicle_documents_type') THEN
        CREATE INDEX idx_vehicle_documents_type ON vehicle_documents(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_routes_driver_id') THEN
        CREATE INDEX idx_routes_driver_id ON routes(driver_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_routes_school_id') THEN
        CREATE INDEX idx_routes_school_id ON routes(school_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_student_id_date') THEN
        CREATE INDEX idx_attendance_student_id_date ON attendance(student_id, date);
    END IF;
END $$;
