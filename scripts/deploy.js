const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Deploy mock ERC20 tokens
  console.log("Deploying Token1...");
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const token1 = await MockERC20Factory.deploy("TokenE1", "TKE1");
  await token1.waitForDeployment();
  const token1Address = await token1.getAddress();
  console.log("Token1 deployed to:", token1Address);

  console.log("Deploying Token2...");
  const token2 = await MockERC20Factory.deploy("TokenE2", "TKE2");
  await token2.waitForDeployment();
  const token2Address = await token2.getAddress();
  console.log("Token2 deployed to:", token2Address);

  // Mint initial tokens
  const mintAmount = ethers.parseEther("1000000");
  const [deployer] = await ethers.getSigners();
  await token1.mint(await deployer.getAddress(), mintAmount);
  await token2.mint(await deployer.getAddress(), mintAmount);
  console.log("Minted tokens for deployer:", await deployer.getAddress());

  // Deploy QiteSwap
  console.log("Deploying QiteSwap...");
  const QiteSwapFactory = await ethers.getContractFactory("QiteSwap");
  const qiteSwap = await QiteSwapFactory.deploy();
  await qiteSwap.waitForDeployment();
  const qiteSwapAddress = await qiteSwap.getAddress();
  console.log("QiteSwap deployed to:", qiteSwapAddress);

  // Deploy QitePool
  console.log("Deploying QitePool...");
  const QitePoolFactory = await ethers.getContractFactory("QitePool");
  const qitePool = await QitePoolFactory.deploy(
    token1Address, // Address of Token1
    "Liquidity-TokenE1-TokenE2", // Liquidity token name
    "LP-TKE1-TKE2" // Liquidity token symbol
  );
  await qitePool.waitForDeployment();
  const qitePoolAddress = await qitePool.getAddress();
  console.log("QitePool deployed to:", qitePoolAddress);

  // Create a pool in QiteSwap
  console.log("Creating a liquidity pool...");
  const tx = await qiteSwap.createPool(
    token1Address, // Address of Token1
    "Liquidity-TokenE1-TokenE2", // Liquidity token name
    "LP-TKE1-TKE2" // Liquidity token symbol
  );
  await tx.wait(); // Wait for the transaction to complete

  // Retrieve the liquidity pool address
  const poolAddress = await qiteSwap.getPair(token1Address);
  console.log("Liquidity pool address:", poolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });
