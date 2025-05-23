-- Drop existing view if it exists
DROP VIEW IF EXISTS parent_dashboard_view CASCADE;

-- Create parent dashboard view
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
