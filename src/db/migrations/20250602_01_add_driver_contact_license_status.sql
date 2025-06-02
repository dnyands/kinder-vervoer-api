-- Migration: Add missing columns to drivers table for contact info, license, registration, and status
ALTER TABLE drivers
  ADD COLUMN name VARCHAR(100),
  ADD COLUMN contact_number VARCHAR(20),
  ADD COLUMN license_number VARCHAR(50),
  ADD COLUMN vehicle_registration VARCHAR(50),
  ADD COLUMN status VARCHAR(20);
