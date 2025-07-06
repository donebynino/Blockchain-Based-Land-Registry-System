// Configuration for the Land Registry Frontend Application

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

export const CONTRACT_NAME = process.env.REACT_APP_CONTRACT_NAME || 'land-registry';

export const STACKS_NETWORK = process.env.REACT_APP_STACKS_NETWORK || 'testnet';

export const STACKS_API_URL = process.env.REACT_APP_STACKS_API_URL || 'https://stacks-node-api.testnet.stacks.co';

// Application constants
export const APP_NAME = 'Blockchain Land Registry';
export const APP_VERSION = '1.0.0';

// Blockchain constants
export const BLOCKS_PER_DAY = 144; // Approximate blocks per day on Stacks
export const DEFAULT_TRANSFER_EXPIRATION_DAYS = 7;
export const MAX_SIGNERS = 10;

// UI constants
export const ITEMS_PER_PAGE = 20;
export const DEBOUNCE_DELAY = 300;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_ADDRESS: 'Invalid Stacks address format.',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  PROPERTY_NOT_FOUND: 'Property not found.',
  INVALID_PROPERTY_ID: 'Invalid property ID format.',
  TRANSFER_EXPIRED: 'Transfer request has expired.',
  ALREADY_SIGNED: 'You have already signed this transfer.',
  INSUFFICIENT_SIGNATURES: 'Not enough signatures to execute transfer.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  PROPERTY_REGISTERED: 'Property registered successfully.',
  TRANSFER_INITIATED: 'Multi-signature transfer initiated successfully.',
  TRANSFER_SIGNED: 'Transfer signed successfully.',
  TRANSFER_EXECUTED: 'Transfer executed successfully.',
  TRANSFER_CANCELLED: 'Transfer cancelled successfully.',
  VALUATION_ADDED: 'Property valuation added successfully.',
  LIEN_ADDED: 'Property lien added successfully.',
  LIEN_REMOVED: 'Property lien removed successfully.',
};

// Validation patterns
export const VALIDATION = {
  STACKS_ADDRESS: /^S[TM][0-9A-Z]{39}$/,
  PROPERTY_ID: /^[A-Z0-9]{1,32}$/,
  LIEN_ID: /^[A-Z0-9]{1,32}$/,
  AMOUNT: /^\d+(\.\d{1,2})?$/,
};

// Property status options
export const PROPERTY_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  DISPUTED: 'DISPUTED',
  INACTIVE: 'INACTIVE',
} as const;

// Lien types
export const LIEN_TYPES = {
  MORTGAGE: 'MORTGAGE',
  TAX: 'TAX',
  MECHANIC: 'MECHANIC',
  JUDGMENT: 'JUDGMENT',
  OTHER: 'OTHER',
} as const;

// Valuation types
export const VALUATION_TYPES = {
  MARKET: 'MARKET',
  ASSESSED: 'ASSESSED',
  INSURANCE: 'INSURANCE',
  LOAN: 'LOAN',
} as const;

export default {
  API_URL,
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  STACKS_NETWORK,
  STACKS_API_URL,
  APP_NAME,
  APP_VERSION,
  BLOCKS_PER_DAY,
  DEFAULT_TRANSFER_EXPIRATION_DAYS,
  MAX_SIGNERS,
  ITEMS_PER_PAGE,
  DEBOUNCE_DELAY,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION,
  PROPERTY_STATUS,
  LIEN_TYPES,
  VALUATION_TYPES,
};
