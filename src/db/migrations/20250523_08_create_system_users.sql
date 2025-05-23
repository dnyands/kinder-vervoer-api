-- Create roles and permissions tables
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
);

-- Create system users table
CREATE TABLE system_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES system_users(id),
  last_modified_by INTEGER REFERENCES system_users(id)
);

-- Create audit log table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES system_users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_timestamp
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_system_updated_at();

CREATE TRIGGER update_system_users_timestamp
  BEFORE UPDATE ON system_users
  FOR EACH ROW
  EXECUTE FUNCTION update_system_updated_at();

-- Insert default permissions
INSERT INTO permissions (name, description) VALUES
  ('manage_users', 'Create, update, and delete system users'),
  ('view_users', 'View system users'),
  ('manage_lookups', 'Create, update, and delete lookup values'),
  ('view_lookups', 'View lookup values'),
  ('view_analytics', 'Access analytics data'),
  ('manage_drivers', 'Manage driver accounts and documents'),
  ('manage_students', 'Manage student accounts and records'),
  ('manage_parents', 'Manage parent accounts'),
  ('manage_schools', 'Manage school information'),
  ('manage_routes', 'Manage pickup routes and schedules'),
  ('view_monitoring', 'View driver monitoring data'),
  ('manage_payments', 'Manage payment settings and subscriptions');

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Full system access'),
  ('admin', 'Administrative access with some restrictions'),
  ('moderator', 'Basic moderation capabilities');

-- Assign permissions to roles
WITH role_perms AS (
  SELECT 
    r.id as role_id,
    p.id as permission_id,
    r.name as role_name,
    p.name as permission_name
  FROM roles r
  CROSS JOIN permissions p
  WHERE 
    (r.name = 'super_admin') OR
    (r.name = 'admin' AND p.name IN (
      'manage_users', 'manage_lookups', 'view_analytics',
      'manage_drivers', 'manage_students', 'manage_parents',
      'manage_schools', 'manage_routes', 'view_monitoring'
    )) OR
    (r.name = 'moderator' AND p.name IN (
      'view_users', 'view_lookups', 'view_monitoring'
    ))
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_perms;

-- Create default super admin user (password: changeme123)
INSERT INTO system_users (
  name, email, password_hash, role_id
) VALUES (
  'System Admin',
  'admin@kindervervoer.co.za',
  '$2b$10$rQJvCMxCQxEt5NOl6QQ3M.rXdqzZWqZX5XqxR5ZQJzX9VZY1Y5Zvy',
  (SELECT id FROM roles WHERE name = 'super_admin')
);
