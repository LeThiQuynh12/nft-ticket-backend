const { ethers } = require("ethers");
const NFTAbi = require("./EventTicketNFTAbi.json");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;

const contract = new ethers.Contract(
  contractAddress,
  NFTAbi,
  wallet
);

const iface = new ethers.Interface(NFTAbi);

async function mintTicket(to, metadataURI) {
  try {
    if (!ethers.isAddress(to)) {
      throw new Error("Địa chỉ ví nhận NFT không hợp lệ");
    }

    if (!metadataURI) {
      throw new Error("Metadata URI không hợp lệ");
    }

    const recipient = ethers.getAddress(to);

    // Chỉ owner của contract mới có quyền mint
    const tx = await contract.mintTicket(recipient, metadataURI);

    console.log("Mint transaction:", tx.hash);

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("Giao dịch mint NFT thất bại");
    }

    let tokenId = null;

    // Lấy tokenId từ sự kiện ERC721 Transfer
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddress.toLowerCase()) {
        continue;
      }

      try {
        const parsedLog = iface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (
          parsedLog?.name === "Transfer" &&
          parsedLog.args.from === ethers.ZeroAddress &&
          parsedLog.args.to.toLowerCase() === recipient.toLowerCase()
        ) {
          tokenId = parsedLog.args.tokenId.toString();
          break;
        }
      } catch (error) {
        // Bỏ qua log không thuộc sự kiện cần tìm
      }
    }

    if (!tokenId) {
      throw new Error(`Không tìm thấy tokenId: ${tx.hash}`);
    }

    return {
      tx,
      tokenId,
      txHash: tx.hash,
      receipt,
    };
  } catch (error) {
    console.error("Mint NFT error:", error);
    throw error;
  }
}

module.exports = {
  contract,
  mintTicket,
};
