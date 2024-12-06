const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Deploy mock ERC20 tokens
  console.log("Deploying Token1...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token1 = await MockERC20.deploy("Token1", "TK1");
  console.log("Token1 deployed to:", await token1.getAddress()); // Add await here

  console.log("Deploying Token2...");
  const token2 = await MockERC20.deploy("Token2", "TK2");
  console.log("Token2 deployed to:", await token2.getAddress()); // Add await here

  // Mint initial tokens
  const mintAmount = ethers.parseEther("1000");
  const [deployer] = await ethers.getSigners();
  await token1.mint(await deployer.getAddress(), mintAmount);
  await token2.mint(await deployer.getAddress(), mintAmount);
  console.log("Minted tokens for deployer:", await deployer.getAddress());

  // Deploy QiteSwap
  console.log("Deploying QiteSwap...");
  const QiteSwap = await ethers.getContractFactory("QiteSwap");
  const qiteSwap = await QiteSwap.deploy();
  console.log("QiteSwap deployed to:", await qiteSwap.getAddress()); // Add await here

  // Create a pair
  console.log("Creating a liquidity pool...");
  const tx = await qiteSwap.createPairs(
    await token1.getAddress(),
    await token2.getAddress(),
    "Token1",
    "Token2"
  );
  const receipt = await tx.wait();
  const pairAddress = receipt.logs[0].address;
  console.log("Liquidity pool created at:", pairAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });
