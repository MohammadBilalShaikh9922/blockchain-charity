# Transparent Charity — Blockchain Mini Project

A full-stack-style decentralized charity demo built with Solidity + Hardhat + a Vite/React frontend. Donors can contribute test ETH, view campaign totals, and verify donation records on-chain.

## Features
- Solidity smart contract records campaigns and donations on an EVM blockchain.
- Create a charity campaign with a title, description, and goal.
- Donate ETH to a campaign.
- View donation totals and individual donation records.
- Connect an injected wallet such as MetaMask.
- Demo-first: local Hardhat network or Sepolia testnet. **Do not use real funds.**

## Requirements
- Node.js 20+ (recommended)
- npm
- MetaMask browser extension (optional for local UI interaction)

## Run locally

### 1. Install dependencies
```bash
npm install
```

### 2. Start a local blockchain
Terminal 1:
```bash
npm run chain
```
Keep this terminal running.

### 3. Deploy the contract
Terminal 2:
```bash
npm run deploy:local
```
This creates `frontend/src/contract-address.json`.

### 4. Start the website
Terminal 3:
```bash
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

### 5. Connect MetaMask to local Hardhat
- Network name: Hardhat Local
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency: ETH
- Import one of the **local test accounts** printed by `npm run chain` into MetaMask.
- In MetaMask, connect to the app and switch to Hardhat Local.
- Local test ETH has no real-world value.

## Deploy to a public testnet (Sepolia)

1. Create a Sepolia RPC endpoint with a provider such as Alchemy or Infura.
2. Get Sepolia test ETH from a reputable faucet.
3. Copy `.env.example` to `.env`.
4. Set `SEPOLIA_RPC_URL` and `PRIVATE_KEY` in `.env`.
5. Never commit `.env` or share your private key.
6. Run:
```bash
npm run deploy:sepolia
```
7. Copy the printed contract address into `frontend/src/contract-address.json` as:
```json
{"address":"0xYOUR_DEPLOYED_CONTRACT_ADDRESS"}
```
8. Set `VITE_CHAIN_ID=11155111` in `.env` and restart the frontend.

## Deploy the frontend

### Easiest: Vercel or Netlify
- Push this folder to a GitHub repository.
- Import the repository in Vercel or Netlify.
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_CHAIN_ID=31337` for local-only (not useful for public visitors), or `VITE_CHAIN_ID=11155111` for Sepolia.
- **Important:** The contract must already be deployed to the same network and its address must be in `frontend/src/contract-address.json`.
- Vercel/Netlify host the frontend only. The blockchain contract is deployed separately.

## Project structure
```text
contracts/CharityPlatform.sol
scripts/deploy.cjs
frontend/src/App.jsx
frontend/src/contract-address.json
frontend/src/contract-abi.json
hardhat.config.cjs
```

## Important limitations
- This is an educational mini-project, not an audited fundraising platform.
- Blockchain records make donations publicly verifiable, but do not prove a charity is genuine by themselves. Real deployment needs identity checks, legal/compliance review, secure treasury governance, refund policy, and a professional smart-contract audit.
- Do not use real funds or deploy to mainnet for a college demo.
