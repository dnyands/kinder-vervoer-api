import swaggerJsdoc from 'swagger-jsdoc';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
const { version } = packageJson;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kinder Vervoer API',
      version,
      description: 'API documentation for the Kinder Vervoer school transport system',
      license: {
        name: 'Private License',
        url: 'https://your-domain.com/license'
      },
      contact: {
        name: 'API Support',
        url: 'https://your-domain.com/support',
        email: 'support@your-domain.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Driver: {
          type: 'object',
          required: ['name', 'contact_number', 'license_number', 'vehicle_type', 'vehicle_registration', 'status'],
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'John Doe' },
            contact_number: { type: 'string', example: '+27831234567' },
            license_number: { type: 'string', example: 'ABC123456' },
            vehicle_type: { type: 'string', example: 'Minibus' },
            vehicle_registration: { type: 'string', example: 'CA123456' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'], example: 'active' },
            assigned_routes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  route_id: { type: 'integer' },
                  route_name: { type: 'string' },
                  schedule_time: { type: 'string' }
                }
              }
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          required: ['email', 'password', 'role'],
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', example: 'user@email.com' },
            password: { type: 'string', example: '********' },
            role: { type: 'string', enum: ['admin', 'parent', 'driver'], example: 'admin' },
            first_name: { type: 'string', example: 'Jane' },
            last_name: { type: 'string', example: 'Doe' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Parent: {
          type: 'object',
          required: ['name', 'contact_number'],
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Parent Name' },
            contact_number: { type: 'string', example: '+27831234567' },
            email: { type: 'string', example: 'parent@email.com' },
            address: { type: 'string', example: '123 Main St' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Student: {
          type: 'object',
          required: ['name', 'grade', 'parent_id'],
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Student Name' },
            grade: { type: 'string', example: 'Grade 3' },
            parent_id: { type: 'integer', example: 1 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Route: {
          type: 'object',
          required: ['name', 'start_location', 'end_location'],
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Morning Route' },
            start_location: { type: 'string', example: 'School' },
            end_location: { type: 'string', example: 'Home' },
            schedule_time: { type: 'string', example: '07:30' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Rating: {
          type: 'object',
          required: ['driver_id', 'parent_id', 'rating'],
          properties: {
            id: { type: 'integer', example: 1 },
            driver_id: { type: 'integer', example: 1 },
            parent_id: { type: 'integer', example: 1 },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: { type: 'string', example: 'Great driver!' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Subscription: {
          type: 'object',
          required: ['student_id', 'route_id', 'status'],
          properties: {
            id: { type: 'integer', example: 1 },
            student_id: { type: 'integer', example: 1 },
            route_id: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['active', 'inactive', 'expired'], example: 'active' },
            start_date: { type: 'string', format: 'date', example: '2025-06-01' },
            end_date: { type: 'string', format: 'date', example: '2025-12-01' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string'
            },
            code: {
              type: 'string'
            }
          }
        },
        Location: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              format: 'float',
              example: -33.9249
            },
            lng: {
              type: 'number',
              format: 'float',
              example: 18.4241
            }
          }
        },
        Trip: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int64'
            },
            studentId: {
              type: 'integer',
              format: 'int64'
            },
            driverId: {
              type: 'integer',
              format: 'int64'
            },
            tripType: {
              type: 'string',
              enum: ['pickup', 'dropoff']
            },
            status: {
              type: 'string',
              enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled']
            },
            scheduledAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Alert: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int64'
            },
            type: {
              type: 'string',
              enum: ['route_deviation', 'late_arrival', 'no_gps']
            },
            severity: {
              type: 'string',
              enum: ['info', 'warning', 'error']
            },
            metadata: {
              type: 'object'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

export const specs = swaggerJsdoc(options);
