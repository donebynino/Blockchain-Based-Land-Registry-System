import { Request, Response, NextFunction } from 'express';
import Property, { IProperty } from '../models/Property';
import MultiSigTransfer, { IMultiSigTransfer } from '../models/MultiSigTransfer';
import { StacksApiClient } from '../services/stacksApiClient';
import { LandRegistryContract } from '../services/landRegistryContract';
import { asyncHandler } from '../middleware/errorHandler';

// Initialize Stacks API client
const stacksClient = new StacksApiClient();
const landRegistry = new LandRegistryContract(stacksClient);

export const getAllProperties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (error) {
    next(error);
  }
};

export const getPropertyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const property = await Property.findOne({ propertyId: req.params.id });
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property);
  } catch (error) {
    next(error);
  }
};

export const registerProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId, location, area, ownerAddress, documents } = req.body;
    
    // Register on blockchain first
    const txResult = await landRegistry.registerProperty(
      propertyId,
      location.address,
      area,
      ownerAddress,
      'ACTIVE'
    );
    
    // Create property in database
    const property = new Property({
      propertyId,
      blockchainId: txResult.txId,
      location,
      area,
      owner: {
        stacksAddress: ownerAddress
      },
      documents,
      status: 'ACTIVE'
    });
    
    await property.save();
    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

export const transferProperty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId, newOwnerAddress } = req.body;
    
    // Transfer on blockchain
    const txResult = await landRegistry.transferProperty(
      propertyId,
      newOwnerAddress
    );
    
    // Update in database
    const property = await Property.findOneAndUpdate(
      { propertyId },
      { 
        'owner.stacksAddress': newOwnerAddress,
        lastTransferDate: new Date()
      },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.json(property);
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId } = req.params;
    const { name, hash, url } = req.body;

    const property = await Property.findOneAndUpdate(
      { propertyId },
      {
        $push: {
          documents: {
            name,
            hash,
            url,
            uploadDate: new Date()
          }
        }
      },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate a multi-signature property transfer
 */
export const initiateMultiSigTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId, newOwnerAddress, requiredSigners, expirationBlocks, reason, notes } = req.body;
  const initiatorAddress = req.user!.stacksAddress;

  // Validation
  if (!propertyId || !newOwnerAddress || !requiredSigners || !Array.isArray(requiredSigners)) {
    return res.status(400).json({
      message: 'Property ID, new owner address, and required signers array are required'
    });
  }

  if (requiredSigners.length === 0) {
    return res.status(400).json({
      message: 'At least one required signer must be specified'
    });
  }

  // Check if property exists and user is authorized
  const property = await Property.findOne({ propertyId });
  if (!property) {
    return res.status(404).json({ message: 'Property not found' });
  }

  if (property.owner.stacksAddress !== initiatorAddress) {
    return res.status(403).json({
      message: 'Only the property owner can initiate a transfer'
    });
  }

  // Check if there's already a pending transfer
  const existingTransfer = await MultiSigTransfer.findOne({
    propertyId,
    status: 'PENDING'
  });

  if (existingTransfer) {
    return res.status(409).json({
      message: 'A pending multi-signature transfer already exists for this property'
    });
  }

  // Calculate expiration date (default to 30 days if not specified)
  const blocksToExpiry = expirationBlocks || 4320; // ~30 days assuming 10 min blocks
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + Math.floor(blocksToExpiry / 144)); // ~144 blocks per day

  try {
    // Initiate transfer on blockchain
    const txResult = await landRegistry.initiateMultiSigTransfer(
      propertyId,
      newOwnerAddress,
      requiredSigners,
      blocksToExpiry
    );

    // Create transfer record in database
    const multiSigTransfer = new MultiSigTransfer({
      propertyId,
      currentOwner: property.owner.stacksAddress,
      newOwner: newOwnerAddress,
      requiredSigners,
      status: 'PENDING',
      expirationDate,
      initiatedBy: initiatorAddress,
      blockchainTxId: txResult.txId,
      metadata: {
        reason,
        notes,
        requiredSignatureCount: requiredSigners.length,
        currentSignatureCount: 0
      }
    });

    await multiSigTransfer.save();

    res.status(201).json({
      message: 'Multi-signature transfer initiated successfully',
      transfer: multiSigTransfer,
      blockchainTxId: txResult.txId
    });
  } catch (error) {
    console.error('Error initiating multi-sig transfer:', error);
    return res.status(500).json({
      message: 'Failed to initiate multi-signature transfer'
    });
  }
});

/**
 * Sign a pending multi-signature transfer
 */
export const signTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const { signature } = req.body;
  const signerAddress = req.user!.stacksAddress;

  // Validation
  if (!signature) {
    return res.status(400).json({ message: 'Signature is required' });
  }

  // Find pending transfer
  const transfer = await MultiSigTransfer.findOne({
    propertyId,
    status: 'PENDING'
  });

  if (!transfer) {
    return res.status(404).json({
      message: 'No pending multi-signature transfer found for this property'
    });
  }

  // Check if transfer is expired
  if (transfer.isExpired()) {
    transfer.status = 'EXPIRED';
    await transfer.save();
    return res.status(410).json({ message: 'Transfer has expired' });
  }

  // Check if user can sign
  if (!transfer.canSign(signerAddress)) {
    return res.status(403).json({
      message: 'You are not authorized to sign this transfer or have already signed'
    });
  }

  try {
    // Sign on blockchain
    const txResult = await landRegistry.signMultiSigTransfer(propertyId, signerAddress);

    // Add signature to transfer
    await transfer.addSignature(signerAddress, signature, txResult.txId);

    // Check if transfer is now complete
    if (transfer.metadata.currentSignatureCount >= transfer.metadata.requiredSignatureCount) {
      // Execute the transfer on blockchain
      const executeTxResult = await landRegistry.executeMultiSigTransfer(propertyId);

      // Update property ownership
      await Property.findOneAndUpdate(
        { propertyId },
        {
          'owner.stacksAddress': transfer.newOwner,
          lastTransferDate: new Date()
        }
      );

      transfer.status = 'COMPLETED';
      transfer.blockchainTxId = executeTxResult.txId;
      await transfer.save();

      return res.json({
        message: 'Transfer signed and completed successfully',
        transfer,
        executionTxId: executeTxResult.txId
      });
    }

    res.json({
      message: 'Transfer signed successfully',
      transfer,
      signatureTxId: txResult.txId,
      remainingSignatures: transfer.metadata.requiredSignatureCount - transfer.metadata.currentSignatureCount
    });
  } catch (error) {
    console.error('Error signing multi-sig transfer:', error);
    return res.status(500).json({
      message: 'Failed to sign multi-signature transfer'
    });
  }
});

/**
 * Cancel a pending multi-signature transfer
 */
export const cancelTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const userAddress = req.user!.stacksAddress;

  // Find pending transfer
  const transfer = await MultiSigTransfer.findOne({
    propertyId,
    status: 'PENDING'
  });

  if (!transfer) {
    return res.status(404).json({
      message: 'No pending multi-signature transfer found for this property'
    });
  }

  // Check authorization - only initiator or property owner can cancel
  if (transfer.initiatedBy !== userAddress && transfer.currentOwner !== userAddress) {
    return res.status(403).json({
      message: 'Only the transfer initiator or property owner can cancel this transfer'
    });
  }

  try {
    // Cancel on blockchain
    const txResult = await landRegistry.cancelMultiSigTransfer(propertyId);

    // Update transfer status
    transfer.status = 'CANCELLED';
    transfer.blockchainTxId = txResult.txId;
    await transfer.save();

    res.json({
      message: 'Multi-signature transfer cancelled successfully',
      transfer,
      cancellationTxId: txResult.txId
    });
  } catch (error) {
    console.error('Error cancelling multi-sig transfer:', error);
    return res.status(500).json({
      message: 'Failed to cancel multi-signature transfer'
    });
  }
});

/**
 * Get pending multi-signature transfer details
 */
export const getPendingTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId } = req.params;

  // Find pending transfer
  const transfer = await MultiSigTransfer.findOne({
    propertyId,
    status: 'PENDING'
  });

  if (!transfer) {
    return res.status(404).json({
      message: 'No pending multi-signature transfer found for this property'
    });
  }

  // Check if transfer is expired
  if (transfer.isExpired()) {
    transfer.status = 'EXPIRED';
    await transfer.save();
    return res.status(410).json({
      message: 'Transfer has expired',
      transfer
    });
  }

  try {
    // Get blockchain data for verification
    const blockchainData = await landRegistry.getPendingMultiSigTransfer(propertyId);

    res.json({
      transfer,
      blockchainData,
      canSign: req.user ? transfer.canSign(req.user.stacksAddress) : false,
      timeRemaining: Math.max(0, transfer.expirationDate.getTime() - Date.now())
    });
  } catch (error) {
    console.error('Error fetching pending multi-sig transfer:', error);
    // Return database data even if blockchain call fails
    res.json({
      transfer,
      canSign: req.user ? transfer.canSign(req.user.stacksAddress) : false,
      timeRemaining: Math.max(0, transfer.expirationDate.getTime() - Date.now()),
      warning: 'Could not verify with blockchain data'
    });
  }
});