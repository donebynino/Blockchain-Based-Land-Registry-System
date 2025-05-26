# Land Registry API Documentation

## Base URL
`https://api.landregistry.example.com` (Production)
`http://localhost:3001` (Development)

## Authentication
All API requests require authentication using JWT tokens.

**Headers:**
```
Authorization: Bearer <token>
```

## Endpoints

### Properties

#### GET /api/properties
Get all properties.

**Response:**
```json
[
  {
    "propertyId": "PROP123456",
    "blockchainId": "0x123abc...",
    "location": {
      "address": "123 Main St, Anytown, USA",
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    },
    "area": 1500,
    "owner": {
      "stacksAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    },
    "status": "ACTIVE",
    "registrationDate": "2023-01-15T00:00:00.000Z",
    "lastTransferDate": "2023-01-15T00:00:00.000Z"
  }
]
```

#### GET /api/properties/:id
Get property by ID.

**Response:**
```json
{
  "propertyId": "PROP123456",
  "blockchainId": "0x123abc...",
  "location": {
    "address": "123 Main St, Anytown, USA",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "area": 1500,
  "owner": {
    "stacksAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  },
  "status": "ACTIVE",
  "registrationDate": "2023-01-15T00:00:00.000Z",
  "lastTransferDate": "2023-01-15T00:00:00.000Z",
  "documents": [
    {
      "name": "Deed.pdf",
      "hash": "0x456def...",
      "url": "https://storage.example.com/documents/deed.pdf",
      "uploadDate": "2023-01-15T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/properties
Register a new property.

**Request:**
```json
{
  "propertyId": "PROP123456",
  "location": {
    "address": "123 Main St, Anytown, USA",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "area": 1500,
  "ownerAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "documents": [
    {
      "name": "Deed.pdf",
      "hash": "0x456def...",
      "url": "https://storage.example.com/documents/deed.pdf"
    }
  ]
}
```

**Response:**
```json
{
  "propertyId": "PROP123456",
  "blockchainId": "0x123abc...",
  "location": {
    "address": "123 Main St, Anytown, USA",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "area": 1500,
  "owner": {
    "stacksAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  },
  "status": "ACTIVE",
  "registrationDate": "2023-01-15T00:00:00.000Z",
  "lastTransferDate": "2023-01-15T00:00:00.000Z",
  "documents": [
    {
      "name": "Deed.pdf",
      "hash": "0x456def...",
      "url": "https://storage.example.com/documents/deed.pdf",
      "uploadDate": "2023-01-15T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/properties/transfer
Transfer property ownership.

**Request:**
```json
{
  "propertyId": "PROP123456",
  "newOwnerAddress": "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
}
```

**Response:**
```json
{
  "propertyId": "PROP123456",
  "blockchainId": "0x123abc...",
  "owner": {
    "stacksAddress": "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  },
  "lastTransferDate": "2023-02-20T00:00:00.000Z"
}
```

#### POST /api/properties/:id/documents
Upload a document for a property.

**Request:**
```json
{
  "name": "Survey.pdf",
  "hash": "0x789ghi...",
  "url": "https://storage.example.com/documents/survey.pdf"
}
```

**Response:**
```