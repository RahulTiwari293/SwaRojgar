import hre from "hardhat";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const network = await hre.ethers.provider.getNetwork();
    console.log("🚀 Starting deployment to", network.name);
    console.log("⏰ Timestamp:", new Date().toISOString());

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n📝 Deploying contracts with account:", deployer.address);

    // Check deployer balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.log("\n⚠️  WARNING: Account has 0 ETH!");
        console.log("Get Sepolia test ETH from: https://www.alchemy.com/faucets/ethereum-sepolia");
        console.log(`Your wallet address: ${deployer.address}`);
        process.exit(1);
    }

    // Deploy SwaRojgarToken
    console.log("\n📦 Deploying SwaRojgarToken...");
    const SwaRojgarToken = await hre.ethers.getContractFactory("SwaRojgarToken");
    const token = await SwaRojgarToken.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    console.log("✅ SwaRojgarToken deployed to:", tokenAddress);

    // Deploy GigEscrow
    console.log("\n📦 Deploying GigEscrow...");
    const GigEscrow = await hre.ethers.getContractFactory("GigEscrow");
    const escrow = await GigEscrow.deploy(tokenAddress);
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();

    console.log("✅ GigEscrow deployed to:", escrowAddress);

    // Get token details
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const decimals = await token.decimals();

    console.log("\n📊 Token Details:");
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Decimals:", decimals);
    console.log("   Total Supply:", hre.ethers.formatEther(totalSupply), symbol);
    console.log("   Owner:", await token.owner());

    console.log("\n📊 Escrow Details:");
    console.log("   Token Address:", await escrow.srtToken());
    console.log("   Platform Fee:", await escrow.platformFeePercent(), "basis points (2%)");
    console.log("   Fee Collector:", await escrow.feeCollector());
    console.log("   Owner:", await escrow.owner());

    // Save deployment info
    const networkInfo = await hre.ethers.provider.getNetwork();
    const deploymentInfo = {
        network: networkInfo.name,
        chainId: networkInfo.chainId.toString(),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            SwaRojgarToken: {
                address: tokenAddress,
                name: name,
                symbol: symbol,
                totalSupply: totalSupply.toString(),
                decimals: Number(decimals)
            },
            GigEscrow: {
                address: escrowAddress,
                tokenAddress: tokenAddress,
                platformFee: (await escrow.platformFeePercent()).toString(),
                feeCollector: await escrow.feeCollector()
            }
        }
    };

    // Save to JSON file
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const filename = `${networkInfo.name}-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(deploymentsDir, filename),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n💾 Deployment info saved to:", filename);

    // Save latest deployment
    fs.writeFileSync(
        path.join(deploymentsDir, `${networkInfo.name}-latest.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✨ Deployment complete!");
    console.log("\n📋 COPY THESE ADDRESSES:");
    console.log("━".repeat(60));
    console.log(`TOKEN_CONTRACT_ADDRESS=${tokenAddress}`);
    console.log(`ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);
    console.log("━".repeat(60));

    console.log("\n📝 Next Steps:");
    console.log("\n1️⃣  Update backend/.env:");
    console.log(`   TOKEN_CONTRACT_ADDRESS=${tokenAddress}`);
    console.log(`   ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);

    console.log("\n2️⃣  Update frontend .env (in root directory):");
    console.log(`   REACT_APP_TOKEN_CONTRACT_ADDRESS=${tokenAddress}`);
    console.log(`   REACT_APP_ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);

    console.log("\n3️⃣  Import SRT token to MetaMask:");
    console.log(`   • Token Address: ${tokenAddress}`);
    console.log("   • Symbol: SRT");
    console.log("   • Decimals: 18");
    console.log("   • You now have 1,000,000 SRT tokens! 🎉");

    console.log("\n4️⃣  View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${tokenAddress}`);
    console.log(`   https://sepolia.etherscan.io/address/${escrowAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });
