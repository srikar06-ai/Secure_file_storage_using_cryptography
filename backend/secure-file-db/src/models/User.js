/**
 * User Mongoose Model (Database Layer - ES Modules)
 * Module: secure-file-db/src/models/User.js
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required.'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long.'],
      maxlength: [30, 'Username cannot exceed 30 characters.'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes.'],
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        'Please provide a valid email address.'
      ],
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false // NEVER return password hash in queries unless explicitly requested via .select('+passwordHash')
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} is not a valid user role.'
      },
      default: 'user',
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'suspended', 'locked'],
        message: '{VALUE} is not a valid account status.'
      },
      default: 'active'
    },
    publicKey: {
      type: String,
      trim: true,
      default: null
    },
    failedLogins: {
      type: Number,
      default: 0,
      min: 0
    },
    lockedUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.methods.isAccountLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  return userObject;
};

userSchema.index({ role: 1, status: 1 });

export const User = mongoose.model('User', userSchema);
export default User;
