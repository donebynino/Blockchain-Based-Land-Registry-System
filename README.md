# Blockchain-Based Land Registry System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Stacks](https://img.shields.io/badge/Blockchain-Stacks-purple)](https://www.stacks.co/)
[![Version](https://img.shields.io/badge/Version-0.1.0-green)](https://github.com/donebynino/Blockchain-Based-Land-Registry-System)

> The first decentralized land registry system built on the Stacks blockchain, providing immutable property records with enhanced security and transparency.

## Table of Contents
- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Roadmap](#roadmap)
- [Installation & Setup](#installation--setup)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Contact & Support](#contact--support)

## Overview

This project represents the first implementation of a land registry system on the Stacks blockchain, designed to revolutionize how property ownership is recorded, verified, and transferred. By leveraging blockchain technology, we address critical challenges in traditional land registry systems while providing a secure, transparent, and efficient alternative.

**Target Audience:**
- Government land registry departments
- Property developers and real estate companies
- Individual landowners
- Title insurance companies
- Mortgage lenders and financial institutions

## Problem Statement

Traditional land registry systems face numerous challenges that undermine their reliability and efficiency:

| Challenge | Impact |
|-----------|--------|
| Document Forgery | Fraudulent property claims and ownership disputes |
| Centralized Record-Keeping | Vulnerability to data manipulation, corruption, and loss |
| Inefficient Transfers | Lengthy processing times (weeks to months) for property transactions |
| Limited Transparency | Difficulty accessing complete ownership histories |
| High Intermediary Costs | Expensive legal and administrative fees |
| Data Silos | Fragmented information across multiple government departments |
| Manual Verification | Time-consuming and error-prone authentication processes |

## Solution

Our blockchain-based land registry system addresses these challenges through:

### Smart Contract Architecture

<details>
<summary>Click to expand details</summary>

The system utilizes Clarity smart contracts on the Stacks blockchain to create immutable property records with:

- Tamper-proof property registration
- Secure ownership transfers with cryptographic verification
- Complete and transparent transaction history
- Role-based access control for authorized modifications
- Automated compliance with regulatory requirements

```clarity
;; Example from our property registration contract
(define-public (register-property 
    (property-id (string-ascii 32))
    (location (string-utf8 256))
    (area uint)
    (initial-owner principal)
    (status (string-ascii 20))
  )
  (begin
    ;; Only registry authority can register properties
    (asserts! (is-registry-authority) (err ERR_UNAUTHORIZED))
    
    ;; Check if property already exists
    (asserts! (is-none (map-get? properties { property-id: property-id })) 
              (err ERR_ALREADY_REGISTERED))
    
    ;; Register the property
    (map-set properties
      { property-id: property-id }
      {
        owner: initial-owner,
        location: location,
        area: area,
        registration-date: block-height,
        last-transfer-date: block-height,
        status: status
      }
    )
    
    ;; Record in history
    (map-set property-history
      { property-id: property-id, index: u0 }
      {
        from: (var-get registry-authority),
        to: initial-owner,
        timestamp: block-height,
        transaction-type: "REGISTRATION"
      }
    )
    
    (ok true)
  )
)
```
</details>

### Backend API

<details>
<summary>Click to expand details</summary>

RESTful API services that provide:

- Property registration, transfer, and query endpoints
- Document verification and storage
- User authentication and authorization
- Blockchain transaction management
- Integration with existing land registry databases

Key endpoints include:
- `GET /api/properties` - List all properties
- `GET /api/properties/:id` - Get property details
- `POST /api/properties` - Register new property
- `PUT /api/properties/:id/transfer` - Transfer ownership
- `POST /api/properties/:id/documents` - Upload property documents
</details>

### Frontend Interface

<details>
<summary>Click to expand details</summary>

An intuitive web application that offers:

- Interactive property search and visualization
- Secure user authentication with multi-factor options
- Document upload and verification
- Real-time transaction status tracking
- Ownership history visualization
- Mobile-responsive design for field access

![Dashboard Preview](https://via.placeholder.com/800x450?text=Property+Dashboard+Preview)
</details>

### Security Measures

<details>
<summary>Click to expand details</summary>

Comprehensive security implementation including:

- Smart contract security audits
- Role-based access control (RBAC)
- Document hash verification
- JWT authentication with secure token management
- Data encryption at rest and in transit
- Rate limiting and DDoS protection
- Regular security assessments
</details>

## Technology Stack

| Component | Technologies |
|-----------|--------------|
| **Blockchain** | Stacks, Clarity Smart Contracts |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB |
| **Frontend** | React, Redux, TypeScript |
| **Authentication** | JWT, Stacks Authentication |
| **Storage** | IPFS/S3 for documents |
| **Deployment** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions |
| **Testing** | Jest, Supertest, Clarity Testing Framework |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Express API    │────▶│  MongoDB        │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │                 │
         └─────────────▶│  Stacks         │
                        │  Blockchain     │
                        │                 │
                        └─────────────────┘
```

## Features

- **Immutable Property Records**: Blockchain-backed property data that cannot be altered retroactively
- **Secure Ownership Transfers**: Cryptographically verified property transfers
- **Document Verification**: Hash-based verification of property documents
- **Transparent History**: Complete audit trail of all property transactions
- **Geospatial Integration**: Map-based property visualization and search
- **Multi-signature Support**: Requiring multiple parties to approve transfers
- **Automated Compliance**: Smart contract enforcement of regulatory requirements
- **Integration APIs**: Connections to existing government systems

## Roadmap

Our development roadmap is divided into four strategic phases:

### Phase 1: Core Functionality (Completed)
- ✅ Basic property registration and transfer
- ✅ Document upload and verification
- ✅ User authentication and authorization
- ✅ Simple dashboard for property management

### Phase 2: Enhanced Features (Current - Q2 2023)
- 🔄 Multi-signature property transfers
- 🔄 Integration with government ID verification systems
- 🔄 Geospatial mapping interface for property visualization
- 🔄 Advanced search and filtering capabilities
- 🔄 Mobile application for property owners

### Phase 3: Ecosystem Expansion (Q3-Q4 2023)
- ⏳ Integration with mortgage and loan providers
- ⏳ Smart contracts for automated property taxes
- ⏳ Property rental and leasing functionality
- ⏳ API for third-party integrations
- ⏳ Support for multiple jurisdictions and legal frameworks

### Phase 4: Enterprise Features (2024)
- ⏳ Bulk property registration for developers and governments
- ⏳ Advanced analytics and reporting
- ⏳ Integration with IoT devices for property monitoring
- ⏳ Support for complex property structures
- ⏳ Cross-chain interoperability with other blockchain platforms

## Installation & Setup

### Prerequisites
- Node.js v18+
- Docker and Docker Compose
- MongoDB
- Stacks CLI

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/donebynino/Blockchain-Based-Land-Registry-System.git
   cd Blockchain-Based-Land-Registry-System
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env files
   cp .env.example .env
   cd server && cp .env.example .env
   cd ../client && cp .env.example .env
   ```

   Configure the following key variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `STACKS_API_URL`: Stacks blockchain API endpoint
   - `CONTRACT_ADDRESS`: Deployed contract address
   - `JWT_SECRET`: Secret for JWT token generation

4. **Deploy smart contracts (optional for development)**
   ```bash
   # Set up your deployer private key in .env first
   cd scripts
   node deploy-contracts.js
   ```

5. **Start the development environment**
   ```bash
   # Start all services with Docker
   docker-compose up -d

   # Or start services individually
   cd server && npm run dev
   cd client && npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

### Troubleshooting

<details>
<summary>Common Issues</summary>

- **MongoDB Connection Errors**: Ensure MongoDB is running and the connection string is correct
- **Smart Contract Deployment Failures**: Verify you have sufficient STX balance for deployment
- **JWT Authentication Issues**: Check that JWT_SECRET is properly set in environment variables
</details>

## API Documentation

For detailed API documentation, see [docs/api.md](docs/api.md) or access the interactive API documentation at `http://localhost:3001/api-docs` when running the development server.

## Contributing

We welcome contributions from the community! Please review our [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to contribute.

Key points:
- Fork the repository and create a feature branch from `develop`
- Follow the existing code style and add appropriate tests
- Submit a pull request with a clear description of changes
- All PRs require review from at least one maintainer

## Security

Security is paramount for a land registry system. We have implemented comprehensive security measures as detailed in [docs/security.md](docs/security.md).

If you discover a security vulnerability, please do NOT open an issue. Email security@landregistry.example.com instead.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact & Support

- **Email**: donebynino@gmail.com
- **Twitter**: [@donebynino](https://twitter.com/donebynino)
- **Issues**: [GitHub Issues](https://github.com/donebynino/Blockchain-Based-Land-Registry-System/issues)
- **Discussions**: [GitHub Discussions](https://github.com/donebynino/Blockchain-Based-Land-Registry-System/discussions)

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/donebynino">donebynino</a>
</p>
