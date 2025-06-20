import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user with Stacks address
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { stacksAddress, email } = req.body;

  if (!stacksAddress) {
    return res.status(400).json({ message: 'Stacks address is required' });
  }

  // Find or create user
  let user = await User.findOne({ stacksAddress });
  
  if (!user && email) {
    // Create new user if email provided
    user = new User({
      stacksAddress,
      email,
      profile: {
        firstName: 'User',
        lastName: 'Name'
      }
    });
    await user.save();
  } else if (!user) {
    return res.status(404).json({ message: 'User not found. Please provide email for registration.' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { 
      id: user._id,
      stacksAddress: user.stacksAddress,
      role: user.role 
    },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );

  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      stacksAddress: user.stacksAddress,
      role: user.role,
      profile: user.profile,
      isVerified: user.isVerified
    }
  });
}));

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, stacksAddress, firstName, lastName, phone, organization } = req.body;

  if (!email || !stacksAddress || !firstName || !lastName) {
    return res.status(400).json({ 
      message: 'Email, Stacks address, first name, and last name are required' 
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { stacksAddress }]
  });

  if (existingUser) {
    return res.status(409).json({ 
      message: 'User with this email or Stacks address already exists' 
    });
  }

  // Create new user
  const user = new User({
    email,
    stacksAddress,
    profile: {
      firstName,
      lastName,
      phone,
      organization
    }
  });

  await user.save();

  // Generate JWT token
  const token = jwt.sign(
    { 
      id: user._id,
      stacksAddress: user.stacksAddress,
      role: user.role 
    },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );

  res.status(201).json({
    token,
    user: {
      id: user._id,
      email: user.email,
      stacksAddress: user.stacksAddress,
      role: user.role,
      profile: user.profile,
      isVerified: user.isVerified
    }
  });
}));

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.id).select('-__v');
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
}));

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, organization } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user!.id,
    {
      'profile.firstName': firstName,
      'profile.lastName': lastName,
      'profile.phone': phone,
      'profile.organization': organization
    },
    { new: true, runValidators: true }
  ).select('-__v');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
}));

export default router;
