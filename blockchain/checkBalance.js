// blockchain/checkBalance.js
require("dotenv").config();
const { ethers } = require("ethers");

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const balance = await provider.getBalance(process.env.PUBLIC_ADDRESS);
  console.log("Balance:", ethers.formatEther(balance), "MATIC");
}

checkBalance();
