require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("dotenv").config();

const { PRIVATE_KEY } = process.env;

module.exports = {
    solidity: {
        version: "0.8.4",
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    networks: {
        hardhat: {
            gas: 100000000,
            blockGasLimit: 0x1fffffffffffff
        },
        testnet: {
            url: "https://api.s0.b.hmny.io",
            chainId: 1666700000,
            accounts: [`${PRIVATE_KEY}`]
        },
        devnet: {
            url: "https://api.s0.ps.hmny.io/",
            chainId: 1666900000,
            accounts: [`${PRIVATE_KEY}`]
        },
        mainnet: {
            url: "https://api.s0.t.hmny.io",
            chainId: 1666600000,
            accounts: [`${PRIVATE_KEY}`]
        },
    },
    namedAccounts: {
        deployer: 0,
    },
    paths: {
        deploy: "deploy",
        deployments: "deployments",
    },
    mocha: {
        timeout: 1000000
    }
};
