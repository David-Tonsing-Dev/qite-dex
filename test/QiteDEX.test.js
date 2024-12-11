const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QiteSwap DEX", function () {
  let MockERC20, QiteSwap, QitePool;
  let token1, qiteSwap, qitePool;
  let deployer, user, user2, user3, user4;
  const mintAmount = ethers.parseEther("1000");

  before(async function () {
    [deployer, user, user2, user3, user4] = await ethers.getSigners();

    console.log(`Deployer Address: ${await deployer.getAddress()}`);
    console.log(`User1 Address: ${await user.getAddress()}`);
    console.log(`User2 Address: ${await user2.getAddress()}`);
    console.log(`User3 Address: ${await user3.getAddress()}`);
    console.log(`User4 Address: ${await user4.getAddress()}`);

    MockERC20 = await ethers.getContractFactory("MockERC20");
    token1 = await MockERC20.deploy("Token1", "TK1");
    await token1.waitForDeployment();

    console.log(`Token1 Address: ${await token1.getAddress()}`);

    await token1.mint(await deployer.getAddress(), mintAmount);
    console.log(
      `Minted Token1 Balance for Deployer: ${ethers.formatEther(
        await token1.balanceOf(await deployer.getAddress())
      )}`
    );

    QiteSwap = await ethers.getContractFactory("QiteSwap");
    qiteSwap = await QiteSwap.deploy();
    await qiteSwap.waitForDeployment();

    console.log(`QiteSwap Contract Address: ${await qiteSwap.getAddress()}`);

    QitePool = await ethers.getContractFactory("QitePool");
    qitePool = await QitePool.deploy(
      await token1.getAddress(),
      "Liquidity-Token1-Token2",
      "LP-TK1-TK2"
    );
    await qitePool.waitForDeployment();

    console.log(`QitePool Contract Address: ${await qitePool.getAddress()}`);
  });

  async function logBalances(account) {
    const ethBalance = await ethers.provider.getBalance(account);
    const tokenBalance = await token1.balanceOf(account);
    console.log(`ETH Balance of ${account}: ${ethers.formatEther(ethBalance)}`);
    console.log(
      `Token1 Balance of ${account}: ${ethers.formatEther(tokenBalance)}`
    );
  }

  async function logTokenPrices() {
    const [priceInEthw, priceInToken] = await qitePool.getTokenPrice();
    console.log(
      `Price of 1 Token1 in ETHW: ${ethers.formatEther(priceInEthw)}`
    );
    console.log(
      `Price of 1 ETHW in Token1: ${ethers.formatEther(priceInToken)}`
    );
  }

  it("Should add liquidity to the pool", async function () {
    const ethwAmount = ethers.parseEther("10");
    const token1Amount = ethers.parseEther("100");

    console.log("Adding liquidity...");
    console.log("Deployer balances before adding liquidity:");
    await logBalances(await deployer.getAddress());

    await token1.approve(await qitePool.getAddress(), token1Amount);
    const tx = await qitePool.addLiquidity(token1Amount, { value: ethwAmount });
    await tx.wait();

    const ethwReserve = await qitePool.ethwReserve();
    const tokenReserve = await qitePool.tokenReserve();

    console.log("Liquidity added:");
    console.log(`ETHW Reserve: ${ethers.formatEther(ethwReserve)}`);
    console.log(`Token Reserve: ${ethers.formatEther(tokenReserve)}`);

    console.log("Deployer balances after adding liquidity:");
    await logBalances(await deployer.getAddress());

    await logTokenPrices();
  });

  it("Should perform multiple swaps from four different users to simulate price changes", async function () {
    const ethwAmounts = [
      ethers.parseEther("1"),
      ethers.parseEther("2"),
      ethers.parseEther("1.5"),
      ethers.parseEther("3"),
    ];
    const minTokenOuts = [
      ethers.parseEther("4"),
      ethers.parseEther("8"),
      ethers.parseEther("6"),
      ethers.parseEther("10"),
    ];

    console.log("Balances before swaps:");
    console.log("Deployer:");
    await logBalances(await deployer.getAddress());
    console.log("User1:");
    await logBalances(await user.getAddress());
    console.log("User2:");
    await logBalances(await user2.getAddress());
    console.log("User3:");
    await logBalances(await user3.getAddress());
    console.log("User4:");
    await logBalances(await user4.getAddress());

    // User1 (deployer) swap
    console.log("User1 performing a swap...");
    const tokenReserveBeforeSwap1 = await qitePool.tokenReserve();

    await qitePool.swapTokens(true, ethwAmounts[0], minTokenOuts[0], {
      value: ethwAmounts[0],
    });

    const tokenReserveAfterSwap1 = await qitePool.tokenReserve();
    expect(tokenReserveAfterSwap1).to.be.lt(tokenReserveBeforeSwap1);

    console.log(
      "Token Reserve After User1 Swap:",
      ethers.formatEther(tokenReserveAfterSwap1)
    );
    await logTokenPrices();

    // User2 swap
    console.log("User2 performing a swap...");
    const tokenReserveBeforeSwap2 = await qitePool.tokenReserve();

    await qitePool
      .connect(user)
      .swapTokens(true, ethwAmounts[1], minTokenOuts[1], {
        value: ethwAmounts[1],
      });

    const tokenReserveAfterSwap2 = await qitePool.tokenReserve();
    expect(tokenReserveAfterSwap2).to.be.lt(tokenReserveBeforeSwap2);

    console.log(
      "Token Reserve After User2 Swap:",
      ethers.formatEther(tokenReserveAfterSwap2)
    );
    await logTokenPrices();

    // User3 swap
    console.log("User3 performing a swap...");
    const tokenReserveBeforeSwap3 = await qitePool.tokenReserve();

    await qitePool
      .connect(user2)
      .swapTokens(true, ethwAmounts[2], minTokenOuts[2], {
        value: ethwAmounts[2],
      });

    const tokenReserveAfterSwap3 = await qitePool.tokenReserve();
    expect(tokenReserveAfterSwap3).to.be.lt(tokenReserveBeforeSwap3);

    console.log(
      "Token Reserve After User3 Swap:",
      ethers.formatEther(tokenReserveAfterSwap3)
    );
    await logTokenPrices();

    // User4 swap
    console.log("User4 performing a swap...");
    const tokenReserveBeforeSwap4 = await qitePool.tokenReserve();

    await qitePool
      .connect(user3)
      .swapTokens(true, ethwAmounts[3], minTokenOuts[3], {
        value: ethwAmounts[3],
      });

    const tokenReserveAfterSwap4 = await qitePool.tokenReserve();
    expect(tokenReserveAfterSwap4).to.be.lt(tokenReserveBeforeSwap4);

    console.log(
      "Token Reserve After User4 Swap:",
      ethers.formatEther(tokenReserveAfterSwap4)
    );
    await logTokenPrices();

    console.log("Balances after swaps:");
    console.log("Deployer:");
    await logBalances(await deployer.getAddress());
    console.log("User1:");
    await logBalances(await user.getAddress());
    console.log("User2:");
    await logBalances(await user2.getAddress());
    console.log("User3:");
    await logBalances(await user3.getAddress());
    console.log("User4:");
    await logBalances(await user4.getAddress());
  });

  it("Should remove liquidity and return increased ETHW and tokens due to fee accumulation", async function () {
    const liquidityTokenAddress = await qitePool.liquidityToken();
    const LiquidityToken = await ethers.getContractAt(
      "ERC20",
      liquidityTokenAddress
    );

    // Initial LP balance of deployer
    const initialLpBalance = await LiquidityToken.balanceOf(
      await deployer.getAddress()
    );

    console.log(
      `Initial LP Token Balance: ${ethers.formatEther(initialLpBalance)}`
    );

    // Reserves before removal
    const ethwReserveBefore = await qitePool.ethwReserve();
    const tokenReserveBefore = await qitePool.tokenReserve();

    console.log(
      `ETHW Reserve Before: ${ethers.formatEther(ethwReserveBefore)}`
    );
    console.log(
      `Token Reserve Before: ${ethers.formatEther(tokenReserveBefore)}`
    );

    // Remove liquidity
    const tx = await qitePool.removeLiquidity(initialLpBalance);
    await tx.wait();

    // Reserves after removal
    const ethwReserveAfter = await qitePool.ethwReserve();
    const tokenReserveAfter = await qitePool.tokenReserve();

    console.log(`ETHW Reserve After: ${ethers.formatEther(ethwReserveAfter)}`);
    console.log(
      `Token Reserve After: ${ethers.formatEther(tokenReserveAfter)}`
    );

    // Validate user's ETHW balance increases
    const ethwBalanceAfter = await ethers.provider.getBalance(
      await deployer.getAddress()
    );
    const tokenBalanceAfter = await token1.balanceOf(
      await deployer.getAddress()
    );

    console.log(
      `Deployer ETHW Balance After: ${ethers.formatEther(ethwBalanceAfter)}`
    );
    console.log(
      `Deployer Token1 Balance After: ${ethers.formatEther(tokenBalanceAfter)}`
    );

    // Check that the reserves decreased proportionally
    expect(ethwReserveAfter).to.be.lt(ethwReserveBefore);
    expect(tokenReserveAfter).to.be.lt(tokenReserveBefore);

    // Ensure user received ETHW and tokens
    expect(ethwBalanceAfter).to.be.gt(ethwReserveBefore);
    expect(tokenBalanceAfter).to.be.gt(tokenReserveBefore);
  });
});
