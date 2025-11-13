import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

// Config
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// ABI (lấy từ Remix Compile hoặc Sourcify)
const CONTRACT_ABI = [
  "function nextTokenId() view returns (uint256)",
  "function mintTicket(address to, string memory eventName, string memory zone, string memory seat, uint256 price, string memory metadataURI) external returns (uint256)",
  "function getTicket(uint256 tokenId) view returns (string memory eventName, string memory zone, string memory seat, uint256 price, string memory metadataURI)"
];

async function main() {
  // Kết nối provider và signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  // Thông tin vé
  const to = wallet.address;
  const eventName = "Concert 2025";
  const zone = "A1";
  const seat = "12";
  const price = ethers.parseEther("0.01"); // 0.01 MATIC
  const metadataURI = "ipfs://QmYourMetadataHash";

  console.log("Minting ticket...");

  // Mint ticket
  const tx = await contract.mintTicket(to, eventName, zone, seat, price, metadataURI);
  const receipt = await tx.wait();
  console.log("Transaction hash:", receipt.transactionHash);

  // Lấy tokenId mới
  const tokenId = await contract.nextTokenId() - 1n; // nextTokenId tăng sau mint
  console.log("Minted tokenId:", tokenId.toString());

  // Lấy thông tin vé
  const ticket = await contract.getTicket(tokenId);
  console.log("Ticket info:", ticket);
}

main().catch(console.error);
