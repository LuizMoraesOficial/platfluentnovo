import { storage } from '../services/storage.js';

export const requireAuth = async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ message: 'Invalid session' });
    }

    const profile = await storage.getProfileByUserId(userId);
    if (!profile) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ message: 'Profile not found' });
    }

    if (user.must_change_password === true && req.path !== '/api/auth/change-password' && req.path !== '/api/auth/logout') {
      return res.status(403).json({ 
        message: 'Password change required', 
        must_change_password: true 
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        student_level: profile.student_level || undefined,
        is_active: profile.is_active
      }
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.user.profile) {
      return res.status(401).json({ message: 'Profile not found' });
    }

    if (!roles.includes(req.user.profile.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const userId = req.session?.userId;
    
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        const profile = await storage.getProfileByUserId(userId);
        if (profile) {
          req.user = {
            id: user.id,
            username: user.username,
            profile: {
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
              role: profile.role,
              student_level: profile.student_level || undefined,
              is_active: profile.is_active
            }
          };
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};
