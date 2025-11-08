const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vehicleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['bike', 'scooter', 'car', 'bicycle'],
    required: true
  },
  registrationNumber: String,
  model: String,
  color: String,
  insuranceExpiry: Date,
  pollutionExpiry: Date
});

const deliveryPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  profileImage: String,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    lastUpdated: Date
  },
  vehicle: vehicleSchema,
  documents: {
    aadharCard: String,
    panCard: String,
    drivingLicense: String,
    bankPassbook: String,
    photo: String
  },
  bankDetails: {
    accountNumber: String,
    accountHolderName: String,
    ifscCode: String,
    bankName: String
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline', 'on_delivery'],
    default: 'offline'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
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
  stats: {
    totalDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    onTimeRate: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
    averageDeliveryTime: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 } // in km
  },
  currentOrder: {
    orderId: String,
    status: String,
    assignedAt: Date
  },
  workingHours: {
    start: String,
    end: String
  },
  preferredZones: [{
    name: String,
    latitude: Number,
    longitude: Number,
    radius: Number // in km
  }],
  earnings: {
    today: { type: Number, default: 0 },
    thisWeek: { type: Number, default: 0 },
    thisMonth: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  incentives: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  lastActive: Date,
  joiningDate: {
    type: Date,
    default: Date.now
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

// Hash password before saving
deliveryPartnerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
deliveryPartnerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data from JSON output
deliveryPartnerSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.documents;
  delete obj.bankDetails;
  return obj;
};

// Indexes for geospatial queries and performance
deliveryPartnerSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });
deliveryPartnerSchema.index({ status: 1, isActive: 1, isOnline: 1 });
deliveryPartnerSchema.index({ rating: -1 });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
