import userService from '../services/userService.js';

export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = req.user.role;
    if (Array.isArray(roles) ? !roles.includes(userRole) : userRole !== roles) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};

export const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const hasPermission = await userService.hasPermission(req.user.id, permission);
      if (!hasPermission) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

export const checkAnyPermission = (permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const userPermissions = await userService.getUserPermissions(req.user.id);
      const hasAnyPermission = permissions.some(p => userPermissions.includes(p));

      if (!hasAnyPermission) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};
