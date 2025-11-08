const Restaurant = require('../../database/mongodb/models/Restaurant');
const { AppError } = require('../../middleware/errorHandler');
const { cacheService } = require('../../config/redis');
const { calculateDistance } = require('../../utils/geoUtils');

// Create restaurant
exports.createRestaurant = async (req, res, next) => {
  try {
    const restaurantData = {
      ...req.body,
      ownerId: req.user.userId
    };

    const restaurant = await Restaurant.create(restaurantData);

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// Search restaurants with filters
exports.searchRestaurants = async (req, res, next) => {
  try {
    const {
      search,
      cuisine,
      priceRange,
      rating,
      isOpen,
      page = 1,
      limit = 20,
      sortBy = 'rating'
    } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (cuisine) {
      query.cuisine = { $in: cuisine.split(',') };
    }

    if (priceRange) {
      query.priceRange = priceRange;
    }

    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    if (isOpen === 'true') {
      query.isOpen = true;
    }

    const sortOptions = {
      rating: { rating: -1 },
      price_low: { priceRange: 1 },
      price_high: { priceRange: -1 },
      delivery_time: { 'deliveryTime.min': 1 }
    };

    const restaurants = await Restaurant.find(query)
      .select('-menu')
      .sort(sortOptions[sortBy] || { rating: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Restaurant.countDocuments(query);

    res.json({
      success: true,
      data: restaurants,
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

// Get nearby restaurants
exports.getNearbyRestaurants = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const maxDistance = parseFloat(radius);

    // Get all active restaurants
    const restaurants = await Restaurant.find({
      isActive: true,
      isOpen: true
    }).select('-menu');

    // Calculate distance and filter
    const nearbyRestaurants = restaurants
      .map(restaurant => {
        const distance = calculateDistance(
          lat,
          lon,
          restaurant.address.latitude,
          restaurant.address.longitude
        );

        return {
          ...restaurant.toObject(),
          distance
        };
      })
      .filter(r => r.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    res.json({
      success: true,
      data: nearbyRestaurants,
      count: nearbyRestaurants.length
    });
  } catch (error) {
    next(error);
  }
};

// Get restaurant by ID
exports.getRestaurantById = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    // Try cache first
    const cacheKey = `restaurant:${restaurantId}`;
    let restaurant = await cacheService.get(cacheKey);

    if (!restaurant) {
      restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }
      await cacheService.set(cacheKey, restaurant, 1800); // 30 minutes
    }

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// Get menu
exports.getMenu = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { category, isVeg, isAvailable } = req.query;

    const restaurant = await Restaurant.findById(restaurantId).select('menu');
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    let menu = restaurant.menu;

    // Apply filters
    if (category) {
      menu = menu.filter(item => item.category === category);
    }
    if (isVeg === 'true') {
      menu = menu.filter(item => item.isVeg);
    }
    if (isAvailable !== undefined) {
      menu = menu.filter(item => item.isAvailable === (isAvailable === 'true'));
    }

    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    next(error);
  }
};

// Update restaurant
exports.updateRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: restaurantId, ownerId: req.user.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      throw new AppError('Restaurant not found or unauthorized', 404);
    }

    await cacheService.delete(`restaurant:${restaurantId}`);

    res.json({
      success: true,
      message: 'Restaurant updated successfully',
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// Update status (open/close)
exports.updateStatus = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { isOpen } = req.body;

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: restaurantId, ownerId: req.user.userId },
      { isOpen },
      { new: true }
    );

    if (!restaurant) {
      throw new AppError('Restaurant not found or unauthorized', 404);
    }

    await cacheService.delete(`restaurant:${restaurantId}`);

    res.json({
      success: true,
      message: `Restaurant ${isOpen ? 'opened' : 'closed'} successfully`,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// Add menu item
exports.addMenuItem = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.user.userId
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found or unauthorized', 404);
    }

    restaurant.menu.push(req.body);
    await restaurant.save();

    await cacheService.delete(`restaurant:${restaurantId}`);

    res.status(201).json({
      success: true,
      message: 'Menu item added successfully',
      data: restaurant.menu
    });
  } catch (error) {
    next(error);
  }
};

// Update menu item
exports.updateMenuItem = async (req, res, next) => {
  try {
    const { restaurantId, itemId } = req.params;

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.user.userId
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found or unauthorized', 404);
    }

    const menuItem = restaurant.menu.id(itemId);
    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    Object.assign(menuItem, req.body);
    await restaurant.save();

    await cacheService.delete(`restaurant:${restaurantId}`);

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Delete menu item
exports.deleteMenuItem = async (req, res, next) => {
  try {
    const { restaurantId, itemId } = req.params;

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.user.userId
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found or unauthorized', 404);
    }

    restaurant.menu.id(itemId).remove();
    await restaurant.save();

    await cacheService.delete(`restaurant:${restaurantId}`);

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update menu item availability
exports.updateMenuItemAvailability = async (req, res, next) => {
  try {
    const { restaurantId, itemId } = req.params;
    const { isAvailable } = req.body;

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.user.userId
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found or unauthorized', 404);
    }

    const menuItem = restaurant.menu.id(itemId);
    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    menuItem.isAvailable = isAvailable;
    await restaurant.save();

    await cacheService.delete(`restaurant:${restaurantId}`);

    res.json({
      success: true,
      message: 'Menu item availability updated',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Verify restaurant (admin only)
exports.verifyRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { isVerified } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { isVerified },
      { new: true }
    );

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    await cacheService.delete(`restaurant:${restaurantId}`);

    res.json({
      success: true,
      message: 'Restaurant verification status updated',
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// Delete restaurant (admin only)
exports.deleteRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findByIdAndDelete(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    await cacheService.delete(`restaurant:${restaurantId}`);

    res.json({
      success: true,
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
