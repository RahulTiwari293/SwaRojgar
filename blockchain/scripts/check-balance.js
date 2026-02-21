import { ethers } from 'ethers';

const SEPOLIA_RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/TTJIOfd9TkB9hVXHP4DQJn4zrz0GVrLL";
const PRIVATE_KEY = "0xad19f71a4a21d94807a742de555e5b9a68ea74977c2a9ef07f11c7e55619d674";

async function checkBalance() {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("Wallet Address:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.log("\n⚠️  You need Sepolia test ETH!");
        console.log("Get it from: https://www.alchemy.com/faucets/ethereum-sepolia");
        console.log(`Your address: ${wallet.address}`);
    } else {
        console.log("\n✅ You have enough ETH to deploy!");
    }
}

checkBalance().catch(console.error);
