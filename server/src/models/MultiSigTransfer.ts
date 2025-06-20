import mongoose, { Schema, Document } from 'mongoose';

export interface IMultiSigTransfer extends Document {
  propertyId: string;
  currentOwner: string; // Stacks address
  newOwner: string; // Stacks address
  requiredSigners: string[]; // Array of Stacks addresses that need to sign
  providedSignatures: Array<{
    signer: string; // Stacks address
    signature: string; // Transaction signature or hash
    signedAt: Date;
    txId?: string; // Blockchain transaction ID
  }>;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  expirationDate: Date;
  initiatedBy: string; // Stacks address of who initiated the transfer
  blockchainTxId?: string; // Final transfer transaction ID
  metadata: {
    reason?: string;
    notes?: string;
    requiredSignatureCount: number;
    currentSignatureCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MultiSigTransferSchema: Schema = new Schema({
  propertyId: { 
    type: String, 
    required: true,
    ref: 'Property'
  },
  currentOwner: { 
    type: String, 
    required: true,
    trim: true
  },
  newOwner: { 
    type: String, 
    required: true,
    trim: true
  },
  requiredSigners: [{ 
    type: String, 
    required: true,
    trim: true
  }],
  providedSignatures: [{
    signer: { 
      type: String, 
      required: true,
      trim: true
    },
    signature: { 
      type: String, 
      required: true 
    },
    signedAt: { 
      type: Date, 
      default: Date.now 
    },
    txId: { 
      type: String,
      trim: true
    }
  }],
  status: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING'
  },
  expirationDate: { 
    type: Date, 
    required: true 
  },
  initiatedBy: { 
    type: String, 
    required: true,
    trim: true
  },
  blockchainTxId: { 
    type: String,
    trim: true
  },
  metadata: {
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
    requiredSignatureCount: { 
      type: Number, 
      required: true,
      min: 1
    },
    currentSignatureCount: { 
      type: Number, 
      default: 0,
      min: 0
    }
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for efficient queries
MultiSigTransferSchema.index({ propertyId: 1 });
MultiSigTransferSchema.index({ currentOwner: 1 });
MultiSigTransferSchema.index({ newOwner: 1 });
MultiSigTransferSchema.index({ status: 1 });
MultiSigTransferSchema.index({ expirationDate: 1 });
MultiSigTransferSchema.index({ 'requiredSigners': 1 });

// Compound indexes
MultiSigTransferSchema.index({ propertyId: 1, status: 1 });
MultiSigTransferSchema.index({ status: 1, expirationDate: 1 });

// Pre-save middleware to update signature count
MultiSigTransferSchema.pre('save', function(next) {
  if (this.isModified('providedSignatures')) {
    this.metadata.currentSignatureCount = this.providedSignatures.length;
    
    // Auto-complete if all required signatures are provided
    if (this.metadata.currentSignatureCount >= this.metadata.requiredSignatureCount && 
        this.status === 'PENDING') {
      this.status = 'COMPLETED';
    }
  }
  next();
});

// Instance methods
MultiSigTransferSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expirationDate && this.status === 'PENDING';
};

MultiSigTransferSchema.methods.canSign = function(signerAddress: string): boolean {
  // Check if signer is required
  if (!this.requiredSigners.includes(signerAddress)) {
    return false;
  }
  
  // Check if already signed
  const alreadySigned = this.providedSignatures.some(
    sig => sig.signer === signerAddress
  );
  
  return !alreadySigned && this.status === 'PENDING' && !this.isExpired();
};

MultiSigTransferSchema.methods.addSignature = function(
  signerAddress: string, 
  signature: string, 
  txId?: string
) {
  if (!this.canSign(signerAddress)) {
    throw new Error('Cannot add signature: signer not authorized or already signed');
  }
  
  this.providedSignatures.push({
    signer: signerAddress,
    signature,
    signedAt: new Date(),
    txId
  });
  
  return this.save();
};

export default mongoose.model<IMultiSigTransfer>('MultiSigTransfer', MultiSigTransferSchema);
