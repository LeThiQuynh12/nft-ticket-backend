
// blockchain/checkBalance.js

const path = require("path");
const dotenv = require("dotenv");
const { ethers } = require("ethers");

// Đọc file .env nằm trong thư mục backend
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

async function checkBalance() {
  try {
    // 1. Lấy RPC Polygon Amoy
    const rpcUrl =
      process.env.AMOY_RPC_URL ||
      process.env.RPC_URL ||
      "https://rpc-amoy.polygon.technology";

    // 2. Lấy địa chỉ ví cần kiểm tra
    const publicAddress = process.env.PUBLIC_ADDRESS?.trim();

    if (!publicAddress) {
      throw new Error(
        "Không tìm thấy PUBLIC_ADDRESS trong file backend/.env"
      );
    }

    if (!ethers.isAddress(publicAddress)) {
      throw new Error("PUBLIC_ADDRESS không phải địa chỉ ví hợp lệ");
    }

    // 3. Khởi tạo provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // 4. Kiểm tra kết nối mạng
    const network = await provider.getNetwork();

    if (network.chainId !== 80002n) {
      throw new Error(
        `Sai mạng blockchain. Chain ID hiện tại: ${network.chainId}. Cần Polygon Amoy (80002).`
      );
    }

    // 5. Lấy số dư ví
    const balance = await provider.getBalance(publicAddress);

    const formattedBalance = ethers.formatEther(balance);

    // 6. Hiển thị kết quả
    console.log("\n========== WALLET BALANCE ==========");
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId.toString());
    console.log("Address:", publicAddress);
    console.log("Balance:", formattedBalance, "POL");
    console.log("====================================\n");
  } catch (error) {
    console.error("\nLỗi kiểm tra số dư:", error.message);
  }
}

checkBalance();
