import pool from '../db.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

class DynamicLookupService {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  async getCategories() {
    const result = await pool.query(
      `SELECT 
        id, name, slug, description, has_parent,
        parent_category_id, schema
       FROM lookup_categories
       ORDER BY name`
    );
    return result.rows;
  }

  async getCategoryBySlug(slug) {
    const result = await pool.query(
      `SELECT 
        id, name, slug, description, has_parent,
        parent_category_id, schema
       FROM lookup_categories
       WHERE slug = $1`,
      [slug]
    );
    return result.rows[0];
  }

  async createCategory(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate schema format
      try {
        this.ajv.compile(data.schema);
      } catch (error) {
        throw new Error('Invalid JSON schema format');
      }

      const result = await client.query(
        `INSERT INTO lookup_categories (
          name, slug, description, has_parent,
          parent_category_id, schema
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          data.name,
          data.slug,
          data.description,
          data.has_parent || false,
          data.parent_category_id,
          data.schema
        ]
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

  async getValues(categorySlug, options = {}) {
    const category = await this.getCategoryBySlug(categorySlug);
    if (!category) throw new Error('Category not found');

    let query = `
      SELECT v.*, 
        p.name as parent_name,
        c.name as category_name,
        c.slug as category_slug
      FROM lookup_values v
      JOIN lookup_categories c ON v.category_id = c.id
      LEFT JOIN lookup_values p ON v.parent_id = p.id
      WHERE v.category_id = $1
    `;
    const params = [category.id];

    if (options.parentId) {
      query += ` AND v.parent_id = $${params.length + 1}`;
      params.push(options.parentId);
    }

    if (options.search) {
      query += ` AND (
        v.name ILIKE $${params.length + 1} OR
        v.code ILIKE $${params.length + 1}
      )`;
      params.push(`%${options.search}%`);
    }

    if (options.isActive !== undefined) {
      query += ` AND v.is_active = $${params.length + 1}`;
      params.push(options.isActive);
    }

    query += ` ORDER BY v.sort_order, v.name`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getValue(categorySlug, id) {
    const category = await this.getCategoryBySlug(categorySlug);
    if (!category) throw new Error('Category not found');

    const result = await pool.query(
      `SELECT v.*, 
        p.name as parent_name,
        c.name as category_name,
        c.slug as category_slug
       FROM lookup_values v
       JOIN lookup_categories c ON v.category_id = c.id
       LEFT JOIN lookup_values p ON v.parent_id = p.id
       WHERE v.category_id = $1 AND v.id = $2`,
      [category.id, id]
    );
    return result.rows[0];
  }

  async createValue(categorySlug, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const category = await this.getCategoryBySlug(categorySlug);
      if (!category) throw new Error('Category not found');

      // Validate data against schema
      const validate = this.ajv.compile(category.schema);
      if (!validate(data.data)) {
        throw new Error('Invalid data format: ' + this.ajv.errorsText(validate.errors));
      }

      // Check parent if required
      if (category.has_parent && !data.parent_id) {
        throw new Error('Parent ID is required for this category');
      }

      if (data.parent_id) {
        const parentCheck = await client.query(
          'SELECT id FROM lookup_values WHERE id = $1',
          [data.parent_id]
        );
        if (!parentCheck.rows.length) {
          throw new Error('Parent value not found');
        }
      }

      const result = await client.query(
        `INSERT INTO lookup_values (
          category_id, parent_id, code, name,
          data, is_active, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          category.id,
          data.parent_id,
          data.code,
          data.name,
          data.data,
          data.is_active !== undefined ? data.is_active : true,
          data.sort_order || 0
        ]
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

  async updateValue(categorySlug, id, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const category = await this.getCategoryBySlug(categorySlug);
      if (!category) throw new Error('Category not found');

      // Validate data against schema if provided
      if (data.data) {
        const validate = this.ajv.compile(category.schema);
        if (!validate(data.data)) {
          throw new Error('Invalid data format: ' + this.ajv.errorsText(validate.errors));
        }
      }

      const updateFields = [];
      const values = [id];
      let paramCount = 1;

      // Build dynamic update query
      const updateData = {
        name: data.name,
        code: data.code,
        data: data.data,
        is_active: data.is_active,
        sort_order: data.sort_order,
        parent_id: data.parent_id
      };

      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }

      if (!updateFields.length) {
        throw new Error('No fields to update');
      }

      const query = `
        UPDATE lookup_values
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, values);
      if (!result.rows.length) {
        throw new Error('Value not found');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteValue(categorySlug, id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const category = await this.getCategoryBySlug(categorySlug);
      if (!category) throw new Error('Category not found');

      // Check for dependent records
      const dependentCheck = await client.query(
        'SELECT id FROM lookup_values WHERE parent_id = $1 LIMIT 1',
        [id]
      );

      if (dependentCheck.rows.length) {
        throw new Error('Cannot delete: value has dependent records');
      }

      const result = await client.query(
        'DELETE FROM lookup_values WHERE id = $1 RETURNING *',
        [id]
      );

      if (!result.rows.length) {
        throw new Error('Value not found');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async validateData(categorySlug, data) {
    const category = await this.getCategoryBySlug(categorySlug);
    if (!category) throw new Error('Category not found');

    const validate = this.ajv.compile(category.schema);
    return {
      valid: validate(data),
      errors: validate.errors
    };
  }
}

export default new DynamicLookupService();
