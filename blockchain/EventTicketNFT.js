import dotenv from 'dotenv';
// blockchain/EventTicketNFT.js
import { ethers } from 'ethers';

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// ABI copy từ Sourcify hoặc Remix
const CONTRACT_ABI = [
  "function nextTokenId() view returns (uint256)",
  "function mintTicket(address to, string memory eventName, string memory zone, string memory seat, uint256 price, string memory metadataURI) external returns (uint256)",
  "function getTicket(uint256 tokenId) view returns (string memory eventName, string memory zone, string memory seat, uint256 price, string memory metadataURI)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

export default contract;
