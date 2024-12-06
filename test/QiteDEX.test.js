const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QiteDEX", function () {
  let token1, token2, qiteSwap, qitePool;

  beforeEach(async function () {
    const [deployer] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token1 = await MockERC20.deploy("Token1", "TK1");
    token2 = await MockERC20.deploy("Token2", "TK2");

    await token1.mint(deployer.address, ethers.parseEther("1000"));
    await token2.mint(deployer.address, ethers.parseEther("1000"));

    const QiteSwap = await ethers.getContractFactory("QiteSwap");
    qiteSwap = await QiteSwap.deploy();

    const tx = await qiteSwap.createPairs(token1, token2, "Token1", "Token2");

    const receipt = await tx.wait();
    const poolAddress = receipt.logs[0].address;

    const QitePool = await ethers.getContractFactory("QitePool");
    qitePool = await QitePool.deploy(
      token1,
      token2,
      "Liquidity-Token1-Token2",
      "LP-TK1-TK2"
    );
  });

  it("Should deploy tokens and QiteSwap", async function () {
    expect(await token1.name()).to.equal("Token1");
    expect(await token2.symbol()).to.equal("TK2");
    expect(await qiteSwap.allPairsLength()).to.equal(1);
  });

  it("Should add liquidity", async function () {
    const amount = ethers.parseEther("100");
    await token1.approve(await qitePool.getAddress(), amount);
    await token2.approve(await qitePool.getAddress(), amount);
    await qitePool.addLiquidity(amount, amount);

    expect(await qitePool.reserve1()).to.equal(amount);
    expect(await qitePool.reserve2()).to.equal(amount);
  });
});
