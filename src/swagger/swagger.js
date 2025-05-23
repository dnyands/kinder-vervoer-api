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
