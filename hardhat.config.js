require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load environment variables from .env file

console.log("process.env.PRIVATE_KEY", process.env.PRIVATE_KEY);

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    ethpow: {
      url: `https://mainnet.ethereumpow.org`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
};
