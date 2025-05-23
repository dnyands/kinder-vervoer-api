-- Create lookup categories table
CREATE TABLE lookup_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  has_parent BOOLEAN DEFAULT false,
  parent_category_id INTEGER REFERENCES lookup_categories(id),
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create lookup values table
CREATE TABLE lookup_values (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES lookup_categories(id),
  parent_id INTEGER REFERENCES lookup_values(id),
  code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, code),
  UNIQUE(category_id, name, parent_id)
);

-- Add indices
CREATE INDEX idx_lookup_values_category ON lookup_values(category_id);
CREATE INDEX idx_lookup_values_parent ON lookup_values(parent_id);
CREATE INDEX idx_lookup_values_code ON lookup_values(code);
CREATE INDEX idx_lookup_values_data ON lookup_values USING gin(data);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_lookup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lookup_categories_timestamp
  BEFORE UPDATE ON lookup_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_lookup_updated_at();

CREATE TRIGGER update_lookup_values_timestamp
  BEFORE UPDATE ON lookup_values
  FOR EACH ROW
  EXECUTE FUNCTION update_lookup_updated_at();

-- Insert default categories
INSERT INTO lookup_categories (name, slug, description, schema) VALUES
('Provinces', 'provinces', 'South African provinces', 
  '{
    "properties": {
      "code": {"type": "string", "required": true, "maxLength": 10},
      "name": {"type": "string", "required": true}
    }
  }'::jsonb
);

INSERT INTO lookup_categories (name, slug, description, has_parent, parent_category_id, schema) VALUES
('Towns', 'towns', 'South African towns and cities', true, 
  (SELECT id FROM lookup_categories WHERE slug = 'provinces'),
  '{
    "properties": {
      "name": {"type": "string", "required": true},
      "postal_code": {"type": "string", "maxLength": 10}
    }
  }'::jsonb
);

INSERT INTO lookup_categories (name, slug, description, schema) VALUES
('School Types', 'school-types', 'Types of educational institutions',
  '{
    "properties": {
      "name": {"type": "string", "required": true},
      "description": {"type": "string"}
    }
  }'::jsonb
);

INSERT INTO lookup_categories (name, slug, description, schema) VALUES
('Vehicle Types', 'vehicle-types', 'Types of vehicles used for transport',
  '{
    "properties": {
      "name": {"type": "string", "required": true},
      "max_capacity": {"type": "integer", "required": true},
      "description": {"type": "string"}
    }
  }'::jsonb
);

-- Insert some initial data
DO $$ 
DECLARE
  gauteng_id INTEGER;
  wc_id INTEGER;
BEGIN
  -- Insert provinces
  INSERT INTO lookup_values (category_id, name, code, data)
  VALUES 
    ((SELECT id FROM lookup_categories WHERE slug = 'provinces'),
     'Gauteng', 'GP', '{"code": "GP"}'::jsonb)
  RETURNING id INTO gauteng_id;

  INSERT INTO lookup_values (category_id, name, code, data)
  VALUES 
    ((SELECT id FROM lookup_categories WHERE slug = 'provinces'),
     'Western Cape', 'WC', '{"code": "WC"}'::jsonb)
  RETURNING id INTO wc_id;

  -- Insert towns
  INSERT INTO lookup_values (category_id, parent_id, name, data)
  VALUES
    ((SELECT id FROM lookup_categories WHERE slug = 'towns'),
     gauteng_id,
     'Johannesburg',
     '{"postal_code": "2000"}'::jsonb),
    ((SELECT id FROM lookup_categories WHERE slug = 'towns'),
     gauteng_id,
     'Pretoria',
     '{"postal_code": "0002"}'::jsonb),
    ((SELECT id FROM lookup_categories WHERE slug = 'towns'),
     wc_id,
     'Cape Town',
     '{"postal_code": "8000"}'::jsonb);

  -- Insert school types
  INSERT INTO lookup_values (category_id, name, data)
  VALUES
    ((SELECT id FROM lookup_categories WHERE slug = 'school-types'),
     'Primary School',
     '{"description": "Grades 1-7"}'::jsonb),
    ((SELECT id FROM lookup_categories WHERE slug = 'school-types'),
     'Secondary School',
     '{"description": "Grades 8-12"}'::jsonb);

  -- Insert vehicle types
  INSERT INTO lookup_values (category_id, name, data)
  VALUES
    ((SELECT id FROM lookup_categories WHERE slug = 'vehicle-types'),
     'Sedan',
     '{"max_capacity": 4, "description": "Standard car"}'::jsonb),
    ((SELECT id FROM lookup_categories WHERE slug = 'vehicle-types'),
     'Minibus',
     '{"max_capacity": 15, "description": "15-seater minibus"}'::jsonb);
END $$;
