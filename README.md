# SwaRojgar — Decentralized Freelance Marketplace

SwaRojgar (Hindi: "Self-Employment") is a trustless freelancing platform where payments are locked in a smart contract escrow and disputes are resolved through a 3-tier system: AI (GPT-4) → Kleros Decentralized Court → Human Admin.

**Network:** Ethereum Sepolia Testnet  
**Token:** SRT (SwaRojgar Token) — ERC-20, 18 decimals

---

## Deployed Contracts (Sepolia)

| Contract | Address |
|---|---|
| SwaRojgarToken (SRT) | `0xfdA41C31D6630980352F590c753E9Ee5E2964906` |
| GigEscrow | `0x5996AD515E407F1569278a1642cE9f259c1010eA` |

- [SRT on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xfdA41C31D6630980352F590c753E9Ee5E2964906)
- [GigEscrow on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x5996AD515E407F1569278a1642cE9f259c1010eA)

---

## Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local instance on port 27017)
- **MetaMask** browser extension
- **Sepolia ETH** for gas (get from a Sepolia faucet)

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd SwaRojgar

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

---

## 2. Configure Environment Variables

### Frontend — create `SwaRojgar/.env`

```env
VITE_TOKEN_CONTRACT_ADDRESS=0xfdA41C31D6630980352F590c753E9Ee5E2964906
VITE_ESCROW_CONTRACT_ADDRESS=0x5996AD515E407F1569278a1642cE9f259c1010eA
VITE_API_URL=http://localhost:5010
VITE_BACKEND_URL=http://localhost:5010
```

### Backend — create `SwaRojgar/backend/.env`

```env
MONGODB_URI=mongodb://localhost:27017/swarojgar
PORT=5010

# Pinata (IPFS) — sign up at https://pinata.cloud
PINATA_JWT=<your-pinata-jwt>
PINATA_API_KEY=<your-pinata-api-key>
PINATA_SECRET_KEY=<your-pinata-secret-key>

# Alchemy or Infura Sepolia RPC
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>

TOKEN_CONTRACT_ADDRESS=0xfdA41C31D6630980352F590c753E9Ee5E2964906
ESCROW_CONTRACT_ADDRESS=0x5996AD515E407F1569278a1642cE9f259c1010eA

# Deployer wallet private key — NEVER commit a mainnet key
BLOCKCHAIN_PRIVATE_KEY=<your-sepolia-private-key>

# Admin secret for faucet endpoint
ADMIN_SECRET=swarojgar_admin_secret_change_in_prod

# Grok (xAI) key for AI dispute resolution — get from console.x.ai
GROK_API_KEY=xai-...

CHAIN_ID=11155111
```

---

## 3. Start the App

Open **three terminals**:

**Terminal 1 — MongoDB**
```bash
mongod
```

**Terminal 2 — Backend** (runs on port 5010)
```bash


node server.js
```

You should see:
```
MongoDB connected
Server running on port 5010
Blockchain event listener started
```

**Terminal 3 — Frontend** (runs on port 5173)
```bash
cd SwaRojgar
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 4. MetaMask Setup

1. Install [MetaMask](https://metamask.io/) if you haven't already.
2. Add the **Sepolia Testnet** network:
   - Network Name: `Sepolia`
   - RPC URL: `https://rpc.sepolia.org`
   - Chain ID: `11155111`
   - Currency Symbol: `ETH`
3. Get Sepolia ETH from a faucet (e.g. [sepoliafaucet.com](https://sepoliafaucet.com)).
4. **Import the SRT token** into MetaMask:
   - Token contract: `0xfdA41C31D6630980352F590c753E9Ee5E2964906`
   - Symbol: `SRT`, Decimals: `18`

---

## 5. Getting Test SRT Tokens

SRT is required to post and pay for gigs. To get test tokens:

1. Connect your MetaMask wallet using the **Connect Wallet** button (top-right).
2. Click your wallet address to open the dropdown.
3. Click **Get 1000 Test SRT**.
4. Your SRT balance will update after ~5 seconds (1 block confirmation).

> You can call this multiple times to accumulate enough SRT for testing.

---

## 6. App Walkthrough

### As a Client (posting a job)

1. Sign up at `/signup` — select **Client** as your user type.
2. Go to **My Jobs** (`/customer-jobs`).
3. Click **Post New Gig**:
   - Fill in title, description, SRT amount, and deadline.
   - Approve the SRT transfer when MetaMask prompts (Step 1).
   - Confirm the gig creation transaction (Step 2 — locks SRT in escrow).
4. Wait for a freelancer to apply. Once applied, the gig moves to **ASSIGNED**.
5. After the freelancer submits proof, review it under your job card:
   - **Approve Work** — releases 98% of locked SRT to the freelancer (2% platform fee).
   - **Raise Dispute** — triggers the AI dispute resolution flow.

### As a Freelancer (finding and completing work)

1. Sign up at `/signup` — select **Freelancer** as your user type.
2. Go to **Find Jobs** (`/freelancer-jobs`) to browse open gigs.
3. Click **Apply** on a gig — this calls `acceptGig()` on-chain and records your wallet.
4. Navigate to **Submit Work** (`/work-submission`) from your assigned job card.
5. Upload your deliverable files and add a description.
   - Files are uploaded to IPFS via Pinata.
   - A `submitProof()` transaction is sent on-chain with the IPFS hash.
6. Wait for the client to approve your work and receive your SRT payout.

### Dispute Flow

If either party raises a dispute:

| Tier | What happens |
|---|---|
| Tier 1 — AI | GPT-4 analyzes the evidence and proposes a verdict. Both parties vote to accept or reject. |
| Tier 2 — Kleros | If AI vote fails, dispute escalates to Kleros Decentralized Court. Jurors decide. |
| Tier 3 — Human Admin | If Kleros rules 0 (refuse to arbitrate), the platform admin makes the final call. |

Manage disputes from the **Resolution Center** (`/ResolutionCenter`).

---

## 7. Project Structure

```
SwaRojgar/
├── src/                        # React frontend
│   ├── pages/
│   │   ├── CustomerJobs.jsx    # Client: post gigs, review proofs
│   │   ├── FreelancerJobs.jsx  # Freelancer: browse & apply
│   │   └── WorkSubmission.jsx  # Freelancer: submit proof
│   ├── components/
│   │   └── WalletButton.jsx    # MetaMask connect + SRT faucet
│   ├── context/
│   │   └── GigContext.jsx      # Wallet state, toast system
│   ├── blockchain/
│   │   ├── contractInteractions.js  # All on-chain calls
│   │   └── klerosAbi.js             # Single source of truth for ABIs
│   └── App.jsx                 # Routes + PrivateRoute + NetworkBanner
│
├── backend/
│   ├── server.js               # Express app, all routes
│   ├── models/
│   │   ├── Post.js             # Primary gig record (postType: 'job')
│   │   └── User.js             # User accounts
│   ├── blockchain/
│   │   └── blockchainService.js  # On-chain event listeners
│   └── routes/
│       ├── dispute.js          # IPFS upload + dispute API
│       └── posts.js            # Social feed posts
│
└── CLAUDE.md                   # Full technical reference for AI assistants
```

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS v3 |
| Blockchain | ethers.js v6, MetaMask |
| Backend | Node.js, Express, MongoDB + Mongoose |
| Auth | JWT (7-day tokens) |
| IPFS | Pinata |
| Contracts | Solidity ^0.8.20, OpenZeppelin 5.x, Hardhat |
| Dispute | GPT-4 (OpenAI API) + Kleros Court (ERC-792/ERC-1497) |

---

## 9. Common Issues

| Problem | Fix |
|---|---|
| "Wrong Network" banner appears | Click **Switch to Sepolia** in the banner |
| SRT balance shows 0 | Use the **Get 1000 Test SRT** button in the wallet dropdown |
| Transaction fails with "insufficient allowance" | The app handles approval automatically — try again |
| Backend crashes on startup | Make sure MongoDB is running (`mongod`) |
| "Pinata upload failed" | Check `PINATA_JWT` in `backend/.env` |
| No JWT / redirected to login | Sign up or log in first — all job pages require authentication |
