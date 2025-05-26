import mongoose, { Schema, Document } from 'mongoose';

export interface IProperty extends Document {
  propertyId: string;
  blockchainId: string;
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    }
  };
  area: number;
  owner: {
    stacksAddress: string;
    userId?: mongoose.Types.ObjectId;
  };
  registrationDate: Date;
  lastTransferDate: Date;
  status: 'ACTIVE' | 'PENDING' | 'DISPUTED' | 'INACTIVE';
  documents: Array<{
    name: string;
    hash: string;
    url: string;
    uploadDate: Date;
  }>;
  metadata: Record<string, any>;
}

const PropertySchema: Schema = new Schema({
  propertyId: { type: String, required: true, unique: true },
  blockchainId: { type: String, required: true },
  location: {
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  area: { type: Number, required: true },
  owner: {
    stacksAddress: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  registrationDate: { type: Date, default: Date.now },
  lastTransferDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'PENDING', 'DISPUTED', 'INACTIVE'],
    default: 'PENDING'
  },
  documents: [{
    name: { type: String, required: true },
    hash: { type: String, required: true },
    url: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now }
  }],
  metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model<IProperty>('Property', PropertySchema);