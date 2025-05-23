export default {
  type: 'object',
  required: ['name', 'slug', 'schema'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    slug: {
      type: 'string',
      pattern: '^[a-z0-9-]+$',
      minLength: 1,
      maxLength: 100
    },
    description: {
      type: 'string',
      maxLength: 500
    },
    has_parent: {
      type: 'boolean'
    },
    parent_category_id: {
      type: 'integer',
      minimum: 1
    },
    schema: {
      type: 'object',
      required: ['properties'],
      properties: {
        properties: {
          type: 'object',
          minProperties: 1,
          additionalProperties: {
            type: 'object',
            required: ['type'],
            properties: {
              type: {
                type: 'string',
                enum: ['string', 'number', 'integer', 'boolean', 'object', 'array']
              },
              required: {
                type: 'boolean'
              },
              minLength: {
                type: 'integer',
                minimum: 0
              },
              maxLength: {
                type: 'integer',
                minimum: 1
              },
              minimum: {
                type: 'number'
              },
              maximum: {
                type: 'number'
              },
              pattern: {
                type: 'string'
              },
              format: {
                type: 'string',
                enum: ['date', 'date-time', 'email', 'uri', 'uuid']
              },
              items: {
                type: 'object'
              },
              enum: {
                type: 'array',
                minItems: 1
              }
            }
          }
        }
      }
    }
  }
};
