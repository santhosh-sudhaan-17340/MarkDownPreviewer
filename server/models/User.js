const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  bio: {
    type: String,
    maxlength: 500
  },
  profileImage: {
    type: String,
    default: 'default-avatar.png'
  },
  skillsOffered: [{
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['Programming', 'Design', 'Music', 'Language', 'Fitness', 'Cooking', 'Business', 'Other'],
      required: true
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      required: true
    },
    description: String,
    hoursAvailable: {
      type: Number,
      default: 0
    }
  }],
  skillsWanted: [{
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['Programming', 'Design', 'Music', 'Language', 'Fitness', 'Cooking', 'Business', 'Other'],
      required: true
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    }
  }],
  timeCredits: {
    type: Number,
    default: 10 // Starting credits for new users
  },
  escrowedCredits: {
    type: Number,
    default: 0
  },
  reputation: {
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  availability: [{
    dayOfWeek: {
      type: Number, // 0-6 (Sunday-Saturday)
      required: true
    },
    startTime: String, // HH:mm format
    endTime: String
  }],
  completedSessions: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Calculate overall rating
userSchema.methods.updateReputation = function(newRating) {
  const totalRating = (this.reputation.rating * this.reputation.reviewCount) + newRating;
  this.reputation.reviewCount += 1;
  this.reputation.rating = totalRating / this.reputation.reviewCount;
};

module.exports = mongoose.model('User', userSchema);
