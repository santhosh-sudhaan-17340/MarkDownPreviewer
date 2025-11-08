const User = require('../../database/mongodb/models/User');
const DeliveryPartner = require('../../database/mongodb/models/DeliveryPartner');
const { generateToken, logout: logoutToken } = require('../../middleware/auth');
const { AppError } = require('../../middleware/errorHandler');
const { cacheService } = require('../../config/redis');

// Register new user
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      throw new AppError('User with this email or phone already exists', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'customer'
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact support', 403);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Cache user data
    await cacheService.set(`user:${user._id}`, user, 3600);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user profile
exports.getProfile = async (req, res, next) => {
  try {
    // Try to get from cache first
    let user = await cacheService.get(`user:${req.user.userId}`);

    if (!user) {
      user = await User.findById(req.user.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      await cacheService.set(`user:${req.user.userId}`, user, 3600);
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'phone', 'profileImage', 'preferences'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update cache
    await cacheService.set(`user:${user._id}`, user, 3600);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Add address
exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // If this is the first address or isDefault is true, make it default
    if (user.addresses.length === 0 || req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(req.body);
    await user.save();

    // Update cache
    await cacheService.delete(`user:${user._id}`);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Update address
exports.updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      throw new AppError('Address not found', 404);
    }

    // If updating to default, unset other defaults
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, req.body);
    await user.save();

    // Update cache
    await cacheService.delete(`user:${user._id}`);

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Delete address
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.addresses.id(req.params.addressId).remove();
    await user.save();

    // Update cache
    await cacheService.delete(`user:${user._id}`);

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    // Blacklist the token
    await logoutToken(req.token);

    // Clear cache
    await cacheService.delete(`user:${req.user.userId}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, isActive } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Update user status (admin only)
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive },
      { new: true }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Clear cache
    await cacheService.delete(`user:${user._id}`);

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};
