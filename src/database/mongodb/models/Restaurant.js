const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: { type: String, required: true },
  price: { type: Number, required: true },
  image: String,
  isVeg: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  preparationTime: { type: Number, default: 20 }, // in minutes
  customizations: [{
    name: String,
    options: [{
      name: String,
      price: Number
    }]
  }],
  tags: [String],
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 }
});

const timingSchema = new mongoose.Schema({
  day: { type: String, required: true },
  openTime: { type: String, required: true },
  closeTime: { type: String, required: true },
  isClosed: { type: Boolean, default: false }
});

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  ownerId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  cuisine: {
    type: [String],
    required: true
  },
  menu: [menuItemSchema],
  images: [String],
  logo: String,
  rating: {
    type: Number,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  ratingBreakdown: {
    5: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    1: { type: Number, default: 0 }
  },
  priceRange: {
    type: String,
    enum: ['$', '$$', '$$$', '$$$$'],
    default: '$$'
  },
  deliveryTime: {
    min: { type: Number, default: 30 },
    max: { type: Number, default: 45 }
  },
  minimumOrder: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  freeDeliveryAbove: Number,
  timings: [timingSchema],
  isOpen: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  features: {
    acceptsOnline: { type: Boolean, default: true },
    acceptsCash: { type: Boolean, default: true },
    hasParking: { type: Boolean, default: false },
    isDineIn: { type: Boolean, default: false },
    isTakeaway: { type: Boolean, default: true },
    isDelivery: { type: Boolean, default: true }
  },
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  },
  tags: [String],
  certificatesAndLicenses: [{
    name: String,
    number: String,
    expiryDate: Date,
    document: String
  }],
  bankDetails: {
    accountNumber: String,
    accountHolderName: String,
    ifscCode: String,
    bankName: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
restaurantSchema.index({ 'address.latitude': 1, 'address.longitude': 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ isActive: 1, isOpen: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
