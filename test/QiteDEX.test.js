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

    console.log("token1", await token1);
    console.log("token2", await token2);

    const QiteSwap = await ethers.getContractFactory("QiteSwap");
    qiteSwap = await QiteSwap.deploy();

    const tx = await qiteSwap.createPairs(
      token1.target,
      token2.target,
      "Token1",
      "Token2"
    );
    console.log("============2");

    const receipt = await tx.wait();
    console.log("receipt", receipt);
    const poolAddress = receipt.events.find(
      (event) => event.event === "PairCreated"
    ).args.pair;

    console.log("poolAddress", poolAddress);

    const QitePool = await ethers.getContractFactory("QitePool");
    qitePool = QitePool.attach(poolAddress);
  });

  it("Should deploy tokens and QiteSwap", async function () {
    expect(token1.name()).to.equal("Token1");
    expect(token2.symbol()).to.equal("TK2");
    expect(qiteSwap.allPairsLength()).to.equal(1);
  });

  it("Should add liquidity", async function () {
    const amount = ethers.parseEther("100");
    await token1.approve(qitePool.address, amount);
    await token2.approve(qitePool.address, amount);
    await qitePool.addLiquidity(amount, amount);

    expect(await qitePool.reserve1()).to.equal(amount);
    expect(await qitePool.reserve2()).to.equal(amount);
  });
});
