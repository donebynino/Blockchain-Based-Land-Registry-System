import express from 'express';
import User from '../models/User';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', 
  authenticate, 
  authorize(['admin']), 
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    
    const query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { stacksAddress: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-__v')
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', 
  authenticate, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Users can only view their own profile unless they're admin
    if (req.user!.id !== id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(id).select('-__v');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  })
);

/**
 * PUT /api/users/:id/role
 * Update user role (admin only)
 */
router.put('/:id/role', 
  authenticate, 
  authorize(['admin']), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'registry_official'].includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be user, admin, or registry_official' 
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  })
);

/**
 * PUT /api/users/:id/verify
 * Verify user account (admin only)
 */
router.put('/:id/verify', 
  authenticate, 
  authorize(['admin']), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isVerified } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isVerified: Boolean(isVerified) },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  })
);

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', 
  authenticate, 
  authorize(['admin']), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  })
);

/**
 * GET /api/users/search/by-address/:address
 * Find user by Stacks address
 */
router.get('/search/by-address/:address', 
  authenticate, 
  asyncHandler(async (req, res) => {
    const { address } = req.params;

    const user = await User.findOne({ stacksAddress: address })
      .select('_id email stacksAddress profile.firstName profile.lastName isVerified');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  })
);

export default router;
