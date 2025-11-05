const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // Basic Information
  profileFor: {
    type: String,
    enum: ['Self', 'Son', 'Daughter', 'Brother', 'Sister', 'Friend', 'Relative'],
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  maritalStatus: {
    type: String,
    enum: ['Never Married', 'Divorced', 'Widowed', 'Separated'],
    required: true
  },

  // Contact Information
  phone: {
    type: String,
    required: true
  },
  alternatePhone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },

  // Physical Attributes
  height: {
    type: Number, // in cm
    required: true
  },
  weight: Number, // in kg
  complexion: {
    type: String,
    enum: ['Fair', 'Wheatish', 'Dark', 'Very Fair']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  physicalStatus: {
    type: String,
    enum: ['Normal', 'Physically Challenged']
  },

  // Education & Career
  education: {
    type: String,
    required: true
  },
  educationDetails: String,
  occupation: {
    type: String,
    required: true
  },
  occupationDetails: String,
  annualIncome: {
    type: String,
    enum: ['Below 2 Lakhs', '2-5 Lakhs', '5-10 Lakhs', '10-15 Lakhs', '15-20 Lakhs', '20-30 Lakhs', '30-50 Lakhs', '50 Lakhs+']
  },

  // Sourastra Community Specific
  gotra: {
    type: String,
    required: true
  },
  kuldevta: String,
  nativePlace: String,
  manglik: {
    type: String,
    enum: ['Yes', 'No', 'Don\'t Know']
  },

  // Birth Details
  birthTime: String,
  birthPlace: String,
  rashi: String,
  nakshatra: String,

  // Family Details
  familyType: {
    type: String,
    enum: ['Joint', 'Nuclear']
  },
  familyValues: {
    type: String,
    enum: ['Traditional', 'Moderate', 'Liberal']
  },
  fatherName: String,
  fatherOccupation: String,
  motherName: String,
  motherOccupation: String,
  brothers: {
    total: { type: Number, default: 0 },
    married: { type: Number, default: 0 }
  },
  sisters: {
    total: { type: Number, default: 0 },
    married: { type: Number, default: 0 }
  },
  familyIncome: String,

  // Lifestyle
  diet: {
    type: String,
    enum: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian']
  },
  smoking: {
    type: String,
    enum: ['No', 'Occasionally', 'Yes']
  },
  drinking: {
    type: String,
    enum: ['No', 'Occasionally', 'Yes']
  },

  // About
  aboutMe: {
    type: String,
    maxlength: 1000
  },
  hobbies: [String],

  // Partner Preferences
  partnerPreferences: {
    ageFrom: Number,
    ageTo: Number,
    heightFrom: Number,
    heightTo: Number,
    maritalStatus: [String],
    education: [String],
    occupation: [String],
    annualIncome: String,
    manglik: String,
    diet: [String],
    city: [String],
    state: [String],
    country: [String],
    gotra: [String],
    description: String
  },

  // Photos
  photos: [{
    url: String,
    isProfile: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
  }],
  profilePhoto: String,

  // Privacy Settings
  privacySettings: {
    showPhone: { type: Boolean, default: false },
    showPhoto: { type: Boolean, default: true },
    showHoroscope: { type: Boolean, default: true }
  },

  // Profile Status
  profileCompleted: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,

  // Stats
  profileViews: {
    type: Number,
    default: 0
  },

}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate age
userSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
