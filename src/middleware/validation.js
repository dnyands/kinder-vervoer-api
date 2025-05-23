import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import categorySchema from '../schemas/categorySchema.js';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Register all schemas
const schemas = {
  categorySchema
};

Object.entries(schemas).forEach(([name, schema]) => {
  ajv.addSchema(schema, name);
});

export const validateSchema = (schemaName) => {
  return (req, res, next) => {
    const validate = ajv.getSchema(schemaName);
    if (!validate) {
      return res.status(500).json({ message: `Schema ${schemaName} not found` });
    }

    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validate.errors
      });
    }

    next();
  };
};
