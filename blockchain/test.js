// blockchain/test.js
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

dotenv.config();

// === Load ABI từ file JSON ===
const abiPath = path.resolve("./blockchain/EventTicketNFT.abi.json");
const ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

// === Kết nối provider & wallet ===
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// === Kết nối contract ===
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);

// === Hàm test mint NFT ===
async function testMintNFT() {
  try {
    const to = wallet.address;
    const eventName = "Test Event";
    const zone = "A1";
    const seat = "01";
    const price = 100;
    const metadataURI = "ipfs://QmYourMetadataHashHere";

    console.log("🚀 Minting NFT...");

    const tx = await contract.mintTicket(to, eventName, zone, seat, price, metadataURI);
    const receipt = await tx.wait();

    const tokenId = receipt.events[0].args.tokenId.toString();
    console.log("✅ NFT minted successfully!");
    console.log("Token ID:", tokenId);
    console.log("Metadata URI:", metadataURI);
  } catch (err) {
    console.error("❌ Error minting NFT:", err);
  }
}

testMintNFT();
