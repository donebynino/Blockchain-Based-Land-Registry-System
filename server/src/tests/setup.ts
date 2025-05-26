import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Setup MongoDB Memory Server for testing
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI_TEST = mongoServer.getUri();
});

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: 'test-user-id',
      stacksAddress: 'ST1TEST1',
      role: 'user'
    };
    next();
  },
  authorize: (roles) => (req, res, next) => next()
}));