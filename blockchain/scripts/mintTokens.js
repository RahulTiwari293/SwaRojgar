const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Minting from:", deployer.address);

    const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    const recipient = "0x5D93eD2e02C3d2Fc6655603F12fF4c73D37BFf27";
    const amount = ethers.parseEther("10000"); // 10,000 SRT

    const token = await ethers.getContractAt("SwaRojgarToken", tokenAddress);
    const tx = await token.mint(recipient, amount);
    await tx.wait();

    const balance = await token.balanceOf(recipient);
    console.log(`✅ Minted! Balance: ${ethers.formatEther(balance)} SRT`);
}

main().catch(console.error);
