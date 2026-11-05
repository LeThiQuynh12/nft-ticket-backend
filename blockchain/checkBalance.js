// blockchain/checkBalance.js
require("dotenv").config();
const { ethers } = require("ethers");

async function checkBalance() {
  try {
    // Ưu tiên lấy RPC từ Alchemy trong file .env, nếu không có mới dùng RPC dự phòng
    const rpcUrl = process.env.AMOY_RPC_URL || process.env.RPC_URL || "https://rpc-amoy.polygon.technology";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const publicAddress = process.env.PUBLIC_ADDRESS;
    if (!publicAddress) {
      throw new Error("PUBLIC_ADDRESS chua duoc cau hinh trong file .env");
    }

    const balance = await provider.getBalance(publicAddress);
    console.log("Dia chi:", publicAddress);
    console.log("So du:", ethers.formatEther(balance), "POL/MATIC");
  } catch (error) {
    console.error("Loi kiem tra so du:", error.message);
  }
}

checkBalance();