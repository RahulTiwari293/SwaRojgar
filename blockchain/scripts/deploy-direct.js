import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Contract ABIs (we'll compile first to get these)
const tokenArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/SwaRojgarToken.sol/SwaRojgarToken.json', 'utf8'));
const escrowArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/GigEscrow.sol/GigEscrow.json', 'utf8'));

async function main() {
    console.log("🚀 Starting deployment to Sepolia");
    console.log("⏰ Timestamp:", new Date().toISOString());

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);

    console.log("\n📝 Deploying contracts with account:", wallet.address);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.log("\n⚠️  WARNING: Account has 0 ETH!");
        console.log("Get Sepolia test ETH from: https://www.alchemy.com/faucets/ethereum-sepolia");
        process.exit(1);
    }

    // Deploy SwaRojgarToken
    console.log("\n📦 Deploying SwaRojgarToken...");
    const TokenFactory = new ethers.ContractFactory(
        tokenArtifact.abi,
        tokenArtifact.bytecode,
        wallet
    );
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    console.log("✅ SwaRojgarToken deployed to:", tokenAddress);

    // Deploy GigEscrow
    console.log("\n📦 Deploying GigEscrow...");
    const EscrowFactory = new ethers.ContractFactory(
        escrowArtifact.abi,
        escrowArtifact.bytecode,
        wallet
    );
    // Kleros Court Sepolia address + empty extra data
    const KLEROS_ARBITRATOR = "0x90992fb4E15ce0C59aEFfb376460Fda4Ee19C879";
    const escrow = await EscrowFactory.deploy(tokenAddress, KLEROS_ARBITRATOR, "0x");
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
    console.log("   Total Supply:", ethers.formatEther(totalSupply), symbol);

    console.log("\n📊 Escrow Details:");
    console.log("   Token Address:", tokenAddress);
    console.log("   Platform Fee: 200 basis points (2%)");

    // Save deployment info
    const network = await provider.getNetwork();
    const deploymentInfo = {
        network: "sepolia",
        chainId: network.chainId.toString(),
        deployer: wallet.address,
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
                platformFee: "200"
            }
        }
    };

    // Save to JSON file
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const filename = `sepolia-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(deploymentsDir, filename),
        JSON.stringify(deploymentInfo, null, 2)
    );

    fs.writeFileSync(
        path.join(deploymentsDir, 'sepolia-latest.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n💾 Deployment info saved to:", filename);
    console.log("\n✨ Deployment complete!");
    console.log("\n📋 COPY THESE ADDRESSES:");
    console.log("━".repeat(70));
    console.log(`TOKEN_CONTRACT_ADDRESS=${tokenAddress}`);
    console.log(`ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);
    console.log("━".repeat(70));

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
