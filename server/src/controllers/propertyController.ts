import { Request, Response, NextFunction } from 'express';
import Property, { IProperty } from '../models/Property';
import { StacksApiClient } from '../services/stacksApiClient';
import { LandRegistryContract } from '../services/landRegistryContract';

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