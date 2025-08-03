require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1    // Optimize for deployment size
      }
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true  // Useful for local testing
    }
  }
};
