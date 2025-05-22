-- Create test admin user (password: admin123)
INSERT INTO users (email, password_hash, role) 
VALUES (
  'admin@example.com',
  '$2b$10$5RoQIDQ3OH4OKhWHs/jRDeYQDrNqKCwuYQCNgUENQ3sCgBoDNoLCy',
  'admin'
);

-- Create test driver
INSERT INTO drivers (name, license_number, phone_number) 
VALUES (
  'John Smith',
  'DL123456',
  '+1234567890'
);

-- Create test students
INSERT INTO students (
  full_name, 
  grade, 
  guardian_name, 
  guardian_phone, 
  pickup_address, 
  dropoff_address
) 
VALUES 
  (
    'Alice Johnson',
    '3rd',
    'Mary Johnson',
    '+1234567891',
    '123 Pine St, City',
    '456 School Ave, City'
  ),
  (
    'Bob Wilson',
    '4th',
    'James Wilson',
    '+1234567892',
    '789 Oak St, City',
    '456 School Ave, City'
  );

-- Create test pickup route
INSERT INTO pickup_routes (name, description, schedule_time)
VALUES (
  'Morning Route 1',
  'Morning pickup route covering downtown area',
  '07:30:00'
);

-- Create route assignments
WITH route_id AS (SELECT id FROM pickup_routes LIMIT 1),
     driver_id AS (SELECT id FROM drivers LIMIT 1),
     student_ids AS (SELECT id FROM students)
INSERT INTO route_assignments (route_id, driver_id, student_id, pickup_order)
SELECT 
  (SELECT id FROM route_id),
  (SELECT id FROM driver_id),
  id,
  ROW_NUMBER() OVER (ORDER BY id)
FROM student_ids;
