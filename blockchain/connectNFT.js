const dotenv = require('dotenv');
const { ethers } = require('ethers');
const ABI = require('./EventTicketNFT.abi.json');

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);

module.exports = contract;
