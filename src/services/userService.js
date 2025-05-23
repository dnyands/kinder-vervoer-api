import pool from '../db.js';
import bcrypt from 'bcrypt';
import { ROLES, ROLE_PERMISSIONS } from '../config/roles.js';

class UserService {
  async createUser(userData, createdBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userData.password, salt);

      // Validate role
      const roleCheck = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [userData.role]
      );
      if (!roleCheck.rows.length) {
        throw new Error('Invalid role');
      }

      // Create user
      const result = await client.query(
        `INSERT INTO system_users (
          name, email, password_hash, role_id,
          is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, email, is_active, created_at`,
        [
          userData.name,
          userData.email,
          passwordHash,
          roleCheck.rows[0].id,
          userData.isActive !== undefined ? userData.isActive : true,
          createdBy
        ]
      );

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, changes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          createdBy,
          'CREATE',
          'system_users',
          result.rows[0].id,
          { email: userData.email, role: userData.role }
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

  async getUserByEmail(email) {
    const result = await pool.query(
      `SELECT 
        u.id, u.name, u.email, u.password_hash,
        u.is_active, r.name as role
      FROM system_users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1`,
      [email]
    );
    return result.rows[0];
  }

  async getUserById(id) {
    const result = await pool.query(
      `SELECT 
        u.id, u.name, u.email, u.is_active,
        u.created_at, u.updated_at,
        r.name as role,
        array_agg(DISTINCT p.name) as permissions
      FROM system_users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id, r.name`,
      [id]
    );
    return result.rows[0];
  }

  async listUsers(options = {}) {
    let query = `
      SELECT 
        u.id, u.name, u.email, u.is_active,
        u.created_at, u.updated_at,
        r.name as role,
        array_agg(DISTINCT p.name) as permissions
      FROM system_users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
    `;
    const params = [];

    // Add filters
    const whereConditions = [];
    if (options.isActive !== undefined) {
      params.push(options.isActive);
      whereConditions.push(`u.is_active = $${params.length}`);
    }
    if (options.role) {
      params.push(options.role);
      whereConditions.push(`r.name = $${params.length}`);
    }
    if (whereConditions.length) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += `
      GROUP BY u.id, r.name
      ORDER BY u.created_at DESC
    `;

    if (options.limit) {
      params.push(options.limit);
      query += ` LIMIT $${params.length}`;
    }
    if (options.offset) {
      params.push(options.offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async updateUser(id, userData, modifiedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateFields = [];
      const values = [id];
      let paramCount = 1;

      const updateData = {
        name: userData.name,
        email: userData.email,
        is_active: userData.isActive,
        last_modified_by: modifiedBy
      };

      // Handle password update
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password_hash = await bcrypt.hash(userData.password, salt);
      }

      // Handle role update
      if (userData.role) {
        const roleCheck = await client.query(
          'SELECT id FROM roles WHERE name = $1',
          [userData.role]
        );
        if (!roleCheck.rows.length) {
          throw new Error('Invalid role');
        }
        updateData.role_id = roleCheck.rows[0].id;
      }

      // Build dynamic update query
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
        UPDATE system_users
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING id, name, email, is_active, updated_at
      `;

      const result = await client.query(query, values);
      if (!result.rows.length) {
        throw new Error('User not found');
      }

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, changes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          modifiedBy,
          'UPDATE',
          'system_users',
          id,
          userData
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

  async deleteUser(id, deletedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Soft delete by setting is_active to false
      const result = await client.query(
        `UPDATE system_users
        SET is_active = false,
            last_modified_by = $2
        WHERE id = $1
        RETURNING id, name, email, is_active`,
        [id, deletedBy]
      );

      if (!result.rows.length) {
        throw new Error('User not found');
      }

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, changes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          deletedBy,
          'DELETE',
          'system_users',
          id,
          { is_active: false }
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

  async comparePassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  async getUserPermissions(userId) {
    const result = await pool.query(
      `SELECT array_agg(DISTINCT p.name) as permissions
      FROM system_users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id`,
      [userId]
    );
    return result.rows[0]?.permissions || [];
  }

  async hasPermission(userId, permission) {
    if (permission === '*') return true;
    
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT 1
        FROM system_users u
        JOIN roles r ON u.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = $1 AND p.name = $2
      ) as has_permission`,
      [userId, permission]
    );
    return result.rows[0].has_permission;
  }
}

export default new UserService();
