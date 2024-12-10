const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QiteSwap DEX", function () {
  let MockERC20, QiteSwap, QitePool;
  let token1, token2, qiteSwap, qitePool;
  let deployer, user;
  const mintAmount = ethers.parseEther("1000");

  before(async function () {
    // Get accounts
    [deployer, user] = await ethers.getSigners();

    // Deploy MockERC20 tokens
    MockERC20 = await ethers.getContractFactory("MockERC20");
    token1 = await MockERC20.deploy("Token1", "TK1");
    await token1.waitForDeployment();
    token2 = await MockERC20.deploy("Token2", "TK2");
    await token2.waitForDeployment();

    // Mint tokens for deployer
    await token1.mint(await deployer.getAddress(), mintAmount);
    await token2.mint(await deployer.getAddress(), mintAmount);

    // Deploy QiteSwap
    QiteSwap = await ethers.getContractFactory("QiteSwap");
    qiteSwap = await QiteSwap.deploy();
    await qiteSwap.waitForDeployment();

    // Deploy QitePool
    QitePool = await ethers.getContractFactory("QitePool");
    qitePool = await QitePool.deploy(
      await token1.getAddress(),
      "Liquidity-Token1-Token2",
      "LP-TK1-TK2"
    );
    await qitePool.waitForDeployment();
  });

  it("Should create a liquidity pool in QiteSwap", async function () {
    const tx = await qiteSwap.createPool(
      await token1.getAddress(),
      "Liquidity-Token1-Token2",
      "LP-TK1-TK2"
    );
    await tx.wait();

    const poolAddress = await qiteSwap.getPair(await token1.getAddress());
    expect(poolAddress).to.not.equal(ethers.ZeroAddress);
    console.log("Liquidity pool address:", poolAddress);
  });

  it("Should add liquidity to the pool", async function () {
    const ethwAmount = ethers.parseEther("10");
    const token1Amount = ethers.parseEther("100");

    await token1.approve(await qitePool.getAddress(), token1Amount);
    const tx = await qitePool.addLiquidity(token1Amount, { value: ethwAmount });
    await tx.wait();

    const ethwReserve = await qitePool.ethwReserve();
    const tokenReserve = await qitePool.tokenReserve();
    expect(ethwReserve).to.equal(ethwAmount);
    expect(tokenReserve).to.equal(token1Amount);

    console.log(`ETHW Reserve: ${ethers.formatEther(ethwReserve)}`);
    console.log(`Token Reserve: ${ethers.formatEther(tokenReserve)}`);
  });

  it("Should swap ETHW for Token1", async function () {
    const ethwAmount = ethers.parseEther("1");
    const minTokenOut = ethers.parseEther("5");

    const tokenReserveBefore = await qitePool.tokenReserve();

    const tx = await qitePool.swapTokens(
      true, // isEthwToToken
      ethwAmount,
      minTokenOut,
      { value: ethwAmount }
    );
    await tx.wait();

    const tokenReserveAfter = await qitePool.tokenReserve();
    expect(tokenReserveAfter).to.be.lt(tokenReserveBefore); // Token reserve decreases
    console.log(
      `Token Reserve After Swap: ${ethers.formatEther(tokenReserveAfter)}`
    );
  });

  it("Should swap Token1 for ETHW", async function () {
    const tokenAmount = ethers.parseEther("10");
    const minEthwOut = ethers.parseEther("0.5");

    const ethwReserveBefore = await qitePool.ethwReserve();

    await token1.approve(await qitePool.getAddress(), tokenAmount);
    const tx = await qitePool.swapTokens(
      false, // isEthwToToken
      tokenAmount,
      minEthwOut
    );
    await tx.wait();

    const ethwReserveAfter = await qitePool.ethwReserve();
    expect(ethwReserveAfter).to.be.lt(ethwReserveBefore); // ETHW reserve decreases
    console.log(
      `ETHW Reserve After Swap: ${ethers.formatEther(ethwReserveAfter)}`
    );
  });

  it("Should remove liquidity from the pool", async function () {
    // Retrieve the liquidity token address
    const liquidityTokenAddress = await qitePool.liquidityToken();

    // Create a contract instance of the liquidity token
    const LiquidityToken = await ethers.getContractAt(
      "ERC20",
      liquidityTokenAddress
    );

    // Get the deployer's balance of liquidity tokens
    const lpBalance = await LiquidityToken.balanceOf(
      await deployer.getAddress()
    );

    const ethwReserveBefore = await qitePool.ethwReserve();
    const tokenReserveBefore = await qitePool.tokenReserve();

    // Remove liquidity
    const tx = await qitePool.removeLiquidity(lpBalance);
    await tx.wait();

    const ethwReserveAfter = await qitePool.ethwReserve();
    const tokenReserveAfter = await qitePool.tokenReserve();

    // Assertions
    expect(ethwReserveAfter).to.be.lt(ethwReserveBefore); // ETHW reserve decreases
    expect(tokenReserveAfter).to.be.lt(tokenReserveBefore); // Token reserve decreases

    console.log(
      `ETHW Reserve After Removal: ${ethers.formatEther(ethwReserveAfter)}`
    );
    console.log(
      `Token Reserve After Removal: ${ethers.formatEther(tokenReserveAfter)}`
    );
  });
});
