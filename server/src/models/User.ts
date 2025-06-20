import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  stacksAddress: string;
  role: 'user' | 'admin' | 'registry_official';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    organization?: string;
  };
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  stacksAddress: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'registry_official'],
    default: 'user'
  },
  profile: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    organization: { type: String, trim: true }
  },
  isVerified: { type: Boolean, default: false }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Index for efficient queries
UserSchema.index({ email: 1 });
UserSchema.index({ stacksAddress: 1 });

export default mongoose.model<IUser>('User', UserSchema);
