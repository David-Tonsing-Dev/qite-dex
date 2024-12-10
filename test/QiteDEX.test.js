const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QiteSwap DEX", function () {
  let MockERC20, QiteSwap, QitePool;
  let token1, token2, qiteSwap, qitePool;
  let deployer, user;
  const mintAmount = ethers.parseEther("1000");

  before(async function () {
    [deployer, user] = await ethers.getSigners();

    MockERC20 = await ethers.getContractFactory("MockERC20");
    token1 = await MockERC20.deploy("Token1", "TK1");
    await token1.waitForDeployment();
    token2 = await MockERC20.deploy("Token2", "TK2");
    await token2.waitForDeployment();

    await token1.mint(await deployer.getAddress(), mintAmount);
    await token2.mint(await deployer.getAddress(), mintAmount);

    QiteSwap = await ethers.getContractFactory("QiteSwap");
    qiteSwap = await QiteSwap.deploy();
    await qiteSwap.waitForDeployment();

    QitePool = await ethers.getContractFactory("QitePool");
    qitePool = await QitePool.deploy(
      await token1.getAddress(),
      "Liquidity-Token1-Token2",
      "LP-TK1-TK2"
    );
    await qitePool.waitForDeployment();
  });

  async function logTokenPrices() {
    const [priceInEthw, priceInToken] = await qitePool.getTokenPrice();
    console.log(
      `Price of 1 Token1 in ETHW: ${ethers.formatEther(priceInEthw)}`
    );
    console.log(
      `Price of 1 ETHW in Token1: ${ethers.formatEther(priceInToken)}`
    );
  }

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

    await logTokenPrices();
  });

  it("Should swap ETHW for Token1", async function () {
    const ethwAmount = ethers.parseEther("1");
    const minTokenOut = ethers.parseEther("5");

    const tokenReserveBefore = await qitePool.tokenReserve();

    const tx = await qitePool.swapTokens(true, ethwAmount, minTokenOut, {
      value: ethwAmount,
    });
    await tx.wait();

    const tokenReserveAfter = await qitePool.tokenReserve();
    expect(tokenReserveAfter).to.be.lt(tokenReserveBefore);

    console.log(
      `Token Reserve After Swap: ${ethers.formatEther(tokenReserveAfter)}`
    );

    await logTokenPrices();
  });

  it("Should swap Token1 for ETHW", async function () {
    const tokenAmount = ethers.parseEther("10");
    const minEthwOut = ethers.parseEther("0.5");

    const ethwReserveBefore = await qitePool.ethwReserve();

    await token1.approve(await qitePool.getAddress(), tokenAmount);
    const tx = await qitePool.swapTokens(false, tokenAmount, minEthwOut);
    await tx.wait();

    const ethwReserveAfter = await qitePool.ethwReserve();
    expect(ethwReserveAfter).to.be.lt(ethwReserveBefore);

    console.log(
      `ETHW Reserve After Swap: ${ethers.formatEther(ethwReserveAfter)}`
    );

    await logTokenPrices();
  });

  it("Should remove liquidity from the pool", async function () {
    const liquidityTokenAddress = await qitePool.liquidityToken();
    const LiquidityToken = await ethers.getContractAt(
      "ERC20",
      liquidityTokenAddress
    );

    const lpBalance = await LiquidityToken.balanceOf(
      await deployer.getAddress()
    );

    // Ensure reserves are fetched correctly
    const ethwReserveBefore = BigInt(await qitePool.ethwReserve());
    const tokenReserveBefore = BigInt(await qitePool.tokenReserve());

    const tx = await qitePool.removeLiquidity(lpBalance);
    await tx.wait();

    const ethwReserveAfter = BigInt(await qitePool.ethwReserve());
    const tokenReserveAfter = BigInt(await qitePool.tokenReserve());

    // Assert reserves decrease
    expect(ethwReserveAfter).to.be.below(ethwReserveBefore);
    expect(tokenReserveAfter).to.be.below(tokenReserveBefore);

    console.log(
      `ETHW Reserve After Removal: ${ethers.formatEther(
        ethwReserveAfter.toString()
      )}`
    );
    console.log(
      `Token Reserve After Removal: ${ethers.formatEther(
        tokenReserveAfter.toString()
      )}`
    );

    // Check for zero reserves using BigInt
    if (ethwReserveAfter > 0n && tokenReserveAfter > 0n) {
      await logTokenPrices();
    } else {
      console.log("Reserves are empty, skipping price log.");
    }
  });
});
