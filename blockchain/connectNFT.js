const { ethers } = require("ethers");
const NFTAbi = require("./EventTicketNFTAbi.json"); // ABI contract
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, NFTAbi, wallet);

/**
 * Mint một vé NFT
 * @param {string} to - Địa chỉ ví nhận NFT
 * @param {string} ticketType
 * @param {string} zone
 * @param {string} seat
 * @param {BigNumber} price - ethers.parseEther(price.toString())
 * @param {string} metadataURI - IPFS link
 * @returns {string} tokenId
 */
async function mintTicket(to, ticketType, zone, seat, price, metadataURI) {
  try {
    console.log("mintTicket called with:", { to, ticketType, zone, seat, price, metadataURI });

    const tx = await contract.mintTicket(to, ticketType, zone, seat, price, metadataURI);
    console.log("Transaction sent, hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction mined, receipt:", receipt);

    let tokenId = null;
    const mintEvent = receipt.events?.find(
      (e) => e.event === "Transfer" || e.event === "TicketMinted"
    );

    if (mintEvent) tokenId = mintEvent.args.tokenId.toString();

    if (!tokenId) {
      // fallback decode logs
      const iface = new ethers.Interface(NFTAbi);
      for (let log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog(log);
          if (parsedLog?.args?.tokenId) {
            tokenId = parsedLog.args.tokenId.toString();
            break;
          }
        } catch (e) {
          // không phải log này, skip
        }
      }
    }

    if (!tokenId) throw new Error("Could not extract tokenId from transaction");

    return { tx, tokenId };
  } catch (err) {
    console.error("mintTicket error:", err);
    throw err;
  }
}

module.exports = { contract, mintTicket };
