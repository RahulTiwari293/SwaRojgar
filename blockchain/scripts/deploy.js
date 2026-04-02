/**
 * deploy.js — SwaRojgar 3-Tier GigEscrow Deployment
 *
 * Deploys:
 *   1. SwaRojgarToken (SRT ERC-20)
 *   2. GigEscrow (Kleros-enabled, 3-tier dispute resolution)
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network sepolia
 *
 * Kleros Sepolia Court: 0x90992fb4E15ce0C59aEFfb376460Fda4Ee19C879
 * Sub-court 0 (General), 3 jurors
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Kleros Configuration ────────────────────────────────────────────────────
// Kleros Court on Ethereum Sepolia Testnet
const KLEROS_COURT_SEPOLIA = "0x90992fb4E15ce0C59aEFfb376460Fda4Ee19C879";

// Sub-court 0 = General | 3 jurors
// extraData ABI-encodes: (uint96 subCourtId, uint96 numberOfJurors)
function encodeExtraData(subCourtId = 0, numberOfJurors = 3) {
    const { ethers } = hre;
    return ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint96", "uint96"],
        [subCourtId, numberOfJurors]
    );
}
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    const network = hre.network.name;

    console.log("\n🚀 SwaRojgar 3-Tier Escrow Deployment");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`📡 Network: ${network}`);
    console.log(`👤 Deployer: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

    // ── 1. Deploy SwaRojgar Token ───────────────────────────────────────────
    console.log("1️⃣  Deploying SwaRojgarToken...");
    const TokenFactory = await ethers.getContractFactory("SwaRojgarToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log(`   ✅ SwaRojgarToken deployed: ${tokenAddress}`);

    // ── 2. Deploy GigEscrow ─────────────────────────────────────────────────
    console.log("\n2️⃣  Deploying GigEscrow (3-Tier) ...");

    // Use Kleros Court on Sepolia; fallback to a mock address for local testing
    const arbitratorAddress = network === "sepolia"
        ? KLEROS_COURT_SEPOLIA
        : deployer.address; // local: deployer acts as mock arbitrator

    const extraData = encodeExtraData(0, 3); // General court, 3 jurors

    const EscrowFactory = await ethers.getContractFactory("GigEscrow");
    const escrow = await EscrowFactory.deploy(
        tokenAddress,
        arbitratorAddress,
        extraData
    );
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log(`   ✅ GigEscrow deployed: ${escrowAddress}`);
    console.log(`   ⚖️  Arbitrator: ${arbitratorAddress}`);
    console.log(`   📦 ExtraData: subCourt=0, jurors=3`);

    // ── 3. Save Deployment ──────────────────────────────────────────────────
    const timestamp = Date.now();
    const deployment = {
        network,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            SwaRojgarToken: {
                address: tokenAddress,
                name: "SwaRojgar Token",
                symbol: "SRT",
                totalSupply: ethers.formatEther(await token.totalSupply()),
                decimals: 18
            },
            GigEscrow: {
                address: escrowAddress,
                arbitrator: arbitratorAddress,
                extraData,
                subCourtId: 0,
                numberOfJurors: 3,
                platformFee: "200" // 2%
            }
        }
    };

    const deployDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deployDir)) fs.mkdirSync(deployDir, { recursive: true });

    fs.writeFileSync(
        path.join(deployDir, `${network}-${timestamp}.json`),
        JSON.stringify(deployment, null, 2)
    );
    fs.writeFileSync(
        path.join(deployDir, `${network}-latest.json`),
        JSON.stringify(deployment, null, 2)
    );

    console.log(`\n💾 Deployment saved to deployments/${network}-latest.json`);

    // ── 4. Summary ──────────────────────────────────────────────────────────
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ DEPLOYMENT COMPLETE\n");
    console.log(`SwaRojgarToken : ${tokenAddress}`);
    console.log(`GigEscrow      : ${escrowAddress}`);
    if (network === "sepolia") {
        console.log(`\n🔍 Verify on Etherscan:`);
        console.log(`   https://sepolia.etherscan.io/address/${tokenAddress}`);
        console.log(`   https://sepolia.etherscan.io/address/${escrowAddress}`);
        console.log(`\n📋 Add to backend/.env:`);
        console.log(`   TOKEN_CONTRACT_ADDRESS=${tokenAddress}`);
        console.log(`   ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
});
