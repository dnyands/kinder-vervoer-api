-- Create provinces table
CREATE TABLE provinces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create towns table
CREATE TABLE towns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  province_id INTEGER NOT NULL REFERENCES provinces(id),
  postal_code VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, province_id)
);

-- Create school_types table
CREATE TABLE school_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicle_types table
CREATE TABLE vehicle_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  max_capacity INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create document_types table
CREATE TABLE document_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  required BOOLEAN DEFAULT true,
  expiry_required BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_types table
CREATE TABLE notification_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  template TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indices
CREATE INDEX idx_towns_province_id ON towns(province_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for each table
CREATE TRIGGER update_provinces_updated_at
  BEFORE UPDATE ON provinces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_towns_updated_at
  BEFORE UPDATE ON towns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_types_updated_at
  BEFORE UPDATE ON school_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_types_updated_at
  BEFORE UPDATE ON vehicle_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_types_updated_at
  BEFORE UPDATE ON document_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_types_updated_at
  BEFORE UPDATE ON notification_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO provinces (name, code) VALUES
  ('Gauteng', 'GP'),
  ('Western Cape', 'WC'),
  ('KwaZulu-Natal', 'KZN'),
  ('Eastern Cape', 'EC'),
  ('Free State', 'FS'),
  ('Limpopo', 'LP'),
  ('Mpumalanga', 'MP'),
  ('North West', 'NW'),
  ('Northern Cape', 'NC');

INSERT INTO school_types (name, description) VALUES
  ('Primary School', 'Grades 1-7'),
  ('Secondary School', 'Grades 8-12'),
  ('Combined School', 'Grades 1-12'),
  ('Pre-Primary School', 'Pre-school and kindergarten');

INSERT INTO vehicle_types (name, max_capacity, description) VALUES
  ('Sedan', 4, 'Standard car with 4 passenger seats'),
  ('Minibus', 15, '15-seater minibus'),
  ('Van', 8, '8-seater passenger van'),
  ('Bus', 30, '30-seater school bus');

INSERT INTO document_types (name, required, expiry_required, description) VALUES
  ('Driver License', true, true, 'Valid driver''s license'),
  ('Vehicle Registration', true, true, 'Vehicle registration document'),
  ('Insurance', true, true, 'Valid vehicle insurance'),
  ('Police Clearance', true, true, 'Police clearance certificate'),
  ('Vehicle Inspection', true, true, 'Annual vehicle inspection report');

INSERT INTO notification_types (name, template, description) VALUES
  ('Trip Start', 'Your trip has started. Driver: {{driverName}}', 'Sent when driver starts the trip'),
  ('Trip End', 'Your trip has ended. Thank you for using our service.', 'Sent when trip is completed'),
  ('Driver Delay', 'Your driver is running {{minutes}} minutes late.', 'Sent when driver is delayed'),
  ('Route Change', 'Your route has been updated.', 'Sent when route is modified');
