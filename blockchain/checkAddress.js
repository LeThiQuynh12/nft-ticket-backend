const { ethers } = require("ethers");

const wallet = new ethers.Wallet("0xf764a6ad379b0967d1077a1706c94dba12243b263d5f95a39b773a5370bf624b");
console.log("Address:", wallet.address);
