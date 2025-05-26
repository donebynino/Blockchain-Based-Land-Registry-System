import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import Property from '../models/Property';
import { LandRegistryContract } from '../services/landRegistryContract';

// Mock the LandRegistryContract
jest.mock('../services/landRegistryContract');

describe('Property API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/land-registry-test');
  });

  afterAll(async () => {
    // Disconnect from test database
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await Property.deleteMany({});
  });

  describe('GET /api/properties', () => {
    it('should return all properties', async () => {
      // Create test properties
      await Property.create([
        {
          propertyId: 'TEST001',
          blockchainId: 'tx-001',
          location: { address: 'Test Address 1' },
          area: 1000,
          owner: { stacksAddress: 'ST1TEST1' },
          status: 'ACTIVE'
        },
        {
          propertyId: 'TEST002',
          blockchainId: 'tx-002',
          location: { address: 'Test Address 2' },
          area: 2000,
          owner: { stacksAddress: 'ST1TEST2' },
          status: 'ACTIVE'
        }
      ]);

      const response = await request(app).get('/api/properties');
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].propertyId).toBe('TEST001');
      expect(response.body[1].propertyId).toBe('TEST002');
    });
  });

  describe('POST /api/properties', () => {
    it('should register a new property', async () => {
      // Mock the blockchain registration
      const mockTxResult = { txId: 'mock-tx-123', status: 'pending' };
      (LandRegistryContract.prototype.registerProperty as jest.Mock).mockResolvedValue(mockTxResult);

      const propertyData = {
        propertyId: 'TEST003',
        location: {
          address: 'Test Address 3',
          coordinates: { latitude: 40.7128, longitude: -74.0060 }
        },
        area: 1500,
        ownerAddress: 'ST1TEST3',
        documents: [
          {
            name: 'Test Document',
            hash: 'hash123',
            url: 'https://example.com/doc'
          }
        ]
      };

      const response = await request(app)
        .post('/api/properties')
        .send(propertyData)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(201);
      expect(response.body.propertyId).toBe('TEST003');
      expect(response.body.blockchainId).toBe('mock-tx-123');
      expect(response.body.owner.stacksAddress).toBe('ST1TEST3');
      
      // Verify it was saved to the database
      const savedProperty = await Property.findOne({ propertyId: 'TEST003' });
      expect(savedProperty).not.toBeNull();
      expect(savedProperty?.location.address).toBe('Test Address 3');
    });
  });

  describe('POST /api/properties/transfer', () => {
    it('should transfer property ownership', async () => {
      // Create a test property
      await Property.create({
        propertyId: 'TEST004',
        blockchainId: 'tx-004',
        location: { address: 'Test Address 4' },
        area: 1000,
        owner: { stacksAddress: 'ST1TEST4' },
        status: 'ACTIVE'
      });

      // Mock the blockchain transfer
      const mockTxResult = { txId: 'mock-tx-transfer', status: 'pending' };
      (LandRegistryContract.prototype.transferProperty as jest.Mock).mockResolvedValue(mockTxResult);

      const transferData = {
        propertyId: 'TEST004',
        newOwnerAddress: 'ST1TEST5'
      };

      const response = await request(app)
        .post('/api/properties/transfer')
        .send(transferData)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.owner.stacksAddress).toBe('ST1TEST5');
      
      // Verify it was updated in the database
      const updatedProperty = await Property.findOne({ propertyId: 'TEST004' });
      expect(updatedProperty?.owner.stacksAddress).toBe('ST1TEST5');
    });
  });
});