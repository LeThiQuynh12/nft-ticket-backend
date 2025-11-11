// utils/blockchain.js
require("dotenv").config();
const { ethers } = require("ethers");
const contractABI = require("../abi/EventTicketNFT.json").abi;
 // ABI sau khi compile xong

// 🧩 Khởi tạo provider, ví và contract instance
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

/**
 * 🪙 Mint NFT Ticket cho khách hàng
 * @param {string} buyerAddress - địa chỉ ví của người mua
 * @param {string} eventName - tên sự kiện
 * @param {string} zone - khu vực
 * @param {string} seat - chỗ ngồi
 * @param {number} price - giá vé
 * @param {string} metadataURI - link metadata (Pinata IPFS)
 */
async function mintTicket(buyerAddress, eventName, zone, seat, price, metadataURI) {
  try {
    console.log(`🎫 Minting NFT cho ${buyerAddress}...`);
    const tx = await contract.mintTicket(
      buyerAddress,
      eventName,
      zone,
      seat,
      price,
      metadataURI
    );

    const receipt = await tx.wait();
    console.log("✅ Mint thành công. Tx Hash:", receipt.hash);
    return receipt.hash;
  } catch (err) {
    console.error("❌ Lỗi khi mint NFT:", err);
    throw err;
  }
}

module.exports = { mintTicket };
