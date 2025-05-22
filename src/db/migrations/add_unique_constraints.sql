-- Add unique constraints for drivers
ALTER TABLE drivers
ADD CONSTRAINT unique_driver_contact UNIQUE (contact_number);

-- Add unique constraints for students
ALTER TABLE students
ADD CONSTRAINT unique_student_guardian_phone UNIQUE (guardian_phone);

-- Create an index to improve lookup performance
CREATE INDEX idx_driver_contact ON drivers(contact_number);
CREATE INDEX idx_student_guardian_phone ON students(guardian_phone);

-- Note: license_number already has a UNIQUE constraint from the table creation
