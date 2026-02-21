# SwaRojgar Blockchain - Quick Start

## Current Status

✅ **Completed**:
- Smart contracts created (SwaRojgarToken.sol, GigEscrow.sol)
- Deployment scripts ready
- Comprehensive test suite
- Configuration files

⚠️ **Blocker**: Node.js version incompatibility
- Current: Node.js 25.6.0
- Required: Node.js 22 LTS

## Immediate Next Steps

### 1. Fix Node.js Version (Required)

**Option A: Using NVM (Recommended)**
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 22
nvm install 22
nvm use 22
```

**Option B: Direct Download**
Download from https://nodejs.org/ (choose 22 LTS)

### 2. Compile Contracts
```bash
cd /Users/rahultiwari/Desktop/LABS/SwaRojgar/blockchain
npm run compile
```

### 3. Run Tests
```bash
npm test
```

### 4. Deploy to Sepolia Testnet

**Setup `.env` file**:
```bash
cp .env.example .env
# Edit .env with your credentials
```

**Deploy**:
```bash
npm run deploy:sepolia
```

## What's Ready to Use

### Smart Contracts
1. **SwaRojgarToken.sol** - ERC20 token (1M supply, mintable, burnable)
2. **GigEscrow.sol** - Automated escrow with:
   - Gig creation with token deposit
   - Freelancer acceptance
   - IPFS proof submission
   - Automatic payment on approval
   - Dispute resolution
   - 2% platform fee

### Files Created
```
blockchain/
├── contracts/
│   ├── SwaRojgarToken.sol
│   └── GigEscrow.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── GigEscrow.test.js
├── hardhat.config.js
├── package.json
└── .env.example
```

## After Deployment

1. Save contract addresses from deployment output
2. Update backend `.env`:
   ```env
   TOKEN_CONTRACT_ADDRESS=0x...
   ESCROW_CONTRACT_ADDRESS=0x...
   ```
3. Proceed to Phase 3: Backend Integration

## Need Help?

See `blockchain_setup_guide.md` for detailed instructions.
