/**
 * Role-based access control middleware
 */

export const ROLES = {
    ADMIN: 'admin',
    DRIVER: 'driver',
    PARENT: 'parent',
    SCHOOL: 'school'
};

/**
 * Middleware to check if user has required role
 * @param {...String} roles - Required roles
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized - No user found' });
        }

        const hasRole = roles.some(role => req.user.role === role);
        if (!hasRole) {
            return res.status(403).json({ message: 'Forbidden - Insufficient role' });
        }

        next();
    };
};

export default {
    ROLES,
    requireRole
};
