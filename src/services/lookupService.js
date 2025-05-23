import pool from '../db.js';

class LookupService {
  constructor() {
    // Map lookup types to their table names and dependencies
    this.lookupConfig = {
      provinces: {
        table: 'provinces',
        dependentTables: ['towns', 'schools', 'drivers', 'students']
      },
      towns: {
        table: 'towns',
        dependentTables: ['schools', 'drivers', 'students'],
        foreignKeys: {
          province_id: {
            table: 'provinces',
            field: 'id'
          }
        }
      },
      schoolTypes: {
        table: 'school_types',
        dependentTables: ['schools']
      },
      vehicleTypes: {
        table: 'vehicle_types',
        dependentTables: ['drivers']
      },
      documentTypes: {
        table: 'document_types',
        dependentTables: ['driver_documents']
      },
      notificationTypes: {
        table: 'notification_types',
        dependentTables: ['notifications']
      }
    };
  }

  async create(type, data) {
    const config = this.lookupConfig[type];
    if (!config) throw new Error('Invalid lookup type');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate foreign keys if any
      if (config.foreignKeys) {
        await this.validateForeignKeys(client, config.foreignKeys, data);
      }

      // Create the record
      const fields = Object.keys(data);
      const values = fields.map((_, i) => `$${i + 1}`);
      const query = `
        INSERT INTO ${config.table} (${fields.join(', ')})
        VALUES (${values.join(', ')})
        RETURNING *
      `;

      const result = await client.query(query, Object.values(data));
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAll(type, options = {}) {
    const config = this.lookupConfig[type];
    if (!config) throw new Error('Invalid lookup type');

    let query = `SELECT * FROM ${config.table}`;
    const params = [];

    // Add filtering if provided
    if (options.filters) {
      const whereConditions = [];
      Object.entries(options.filters).forEach(([key, value], index) => {
        whereConditions.push(`${key} = $${index + 1}`);
        params.push(value);
      });
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }

    // Add sorting
    query += ` ORDER BY ${options.orderBy || 'name'} ${options.order || 'ASC'}`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getById(type, id) {
    const config = this.lookupConfig[type];
    if (!config) throw new Error('Invalid lookup type');

    const result = await pool.query(
      `SELECT * FROM ${config.table} WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async update(type, id, data) {
    const config = this.lookupConfig[type];
    if (!config) throw new Error('Invalid lookup type');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate foreign keys if any
      if (config.foreignKeys) {
        await this.validateForeignKeys(client, config.foreignKeys, data);
      }

      const fields = Object.keys(data);
      const setClause = fields
        .map((field, i) => `${field} = $${i + 2}`)
        .join(', ');
      
      const query = `
        UPDATE ${config.table}
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;

      const values = [id, ...Object.values(data)];
      const result = await client.query(query, values);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(type, id) {
    const config = this.lookupConfig[type];
    if (!config) throw new Error('Invalid lookup type');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check for dependencies
      for (const depTable of config.dependentTables) {
        const depCheck = await client.query(
          `SELECT EXISTS(
            SELECT 1 FROM ${depTable}
            WHERE ${config.table.slice(0, -1)}_id = $1
          )`,
          [id]
        );
        if (depCheck.rows[0].exists) {
          throw new Error(`Cannot delete: ${type} is in use`);
        }
      }

      const result = await client.query(
        `DELETE FROM ${config.table} WHERE id = $1 RETURNING *`,
        [id]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async validateForeignKeys(client, foreignKeys, data) {
    for (const [field, config] of Object.entries(foreignKeys)) {
      if (data[field]) {
        const check = await client.query(
          `SELECT EXISTS(SELECT 1 FROM ${config.table} WHERE ${config.field} = $1)`,
          [data[field]]
        );
        if (!check.rows[0].exists) {
          throw new Error(`Invalid ${field}: record does not exist`);
        }
      }
    }
  }
}

export default new LookupService();
