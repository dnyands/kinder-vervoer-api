-- Create driver documents table
CREATE TABLE driver_documents (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create driver vehicle images table
CREATE TABLE driver_vehicle_images (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    image_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add document verification status to drivers table
ALTER TABLE drivers 
ADD COLUMN documents_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN vehicle_images_verified BOOLEAN DEFAULT FALSE;
