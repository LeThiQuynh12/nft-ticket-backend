
const { ethers } = require("ethers");
const NFTAbi = require("./EventTicketNFTAbi.json");

require("dotenv").config();

// ===============================
// 1. Validate environment
// ===============================

const { AMOY_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

if (!AMOY_RPC_URL) {
  throw new Error("Thiếu AMOY_RPC_URL trong file .env");
}

if (!PRIVATE_KEY) {
  throw new Error("Thiếu PRIVATE_KEY trong file .env");
}

if (!CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) {
  throw new Error("CONTRACT_ADDRESS không hợp lệ");
}

// ===============================
// 2. Initialize provider & contract
// ===============================

const provider = new ethers.JsonRpcProvider(AMOY_RPC_URL);

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const contractAddress = ethers.getAddress(CONTRACT_ADDRESS);

const contract = new ethers.Contract(
  contractAddress,
  NFTAbi,
  wallet
);

const iface = new ethers.Interface(NFTAbi);

// ===============================
// 3. Broadcast mint transaction
// ===============================

/**
 * Gửi transaction mint NFT.
 *
 * Lưu ý:
 * Hàm này chỉ broadcast transaction, không chờ transaction được xác nhận.
 *
 * @param {string} to - Địa chỉ ví nhận NFT
 * @param {string} metadataURI - Metadata URI trên IPFS
 * @returns {Promise<{tx: object, txHash: string}>}
 */
async function mintTicket(to, metadataURI) {
  if (!to || !ethers.isAddress(to)) {
    throw new Error("Địa chỉ ví nhận NFT không hợp lệ");
  }

  if (
    !metadataURI ||
    typeof metadataURI !== "string" ||
    !metadataURI.trim()
  ) {
    throw new Error("Metadata URI không hợp lệ");
  }

  const recipient = ethers.getAddress(to);

  try {
    const tx = await contract.mintTicket(
      recipient,
      metadataURI.trim()
    );

    console.log("=================================");
    console.log("Mint transaction broadcast");
    console.log("Recipient:", recipient);
    console.log("Metadata URI:", metadataURI);
    console.log("Transaction hash:", tx.hash);
    console.log("=================================");

    return {
      tx,
      txHash: tx.hash,
      recipient,
    };
  } catch (error) {
    console.error("Broadcast mint transaction error:", error);
    throw error;
  }
}

// ===============================
// 4. Wait for transaction & get tokenId
// ===============================

/**
 * Chờ transaction xác nhận và lấy tokenId từ Transfer event.
 *
 * @param {object} tx - Transaction response nhận được từ mintTicket
 * @param {string} recipient - Địa chỉ ví nhận NFT
 * @returns {Promise<{tokenId: string, receipt: object, txHash: string}>}
 */
async function waitForMint(tx, recipient) {
  if (!tx || !tx.hash || typeof tx.wait !== "function") {
    throw new Error("Transaction không hợp lệ");
  }

  if (!recipient || !ethers.isAddress(recipient)) {
    throw new Error("Địa chỉ ví nhận NFT không hợp lệ");
  }

  const expectedRecipient = ethers.getAddress(recipient);

  console.log("Waiting for mint confirmation:", tx.hash);

  let receipt;

  try {
    receipt = await tx.wait();
  } catch (error) {
    console.error("Wait for mint transaction error:", {
      txHash: tx.hash,
      message: error.message,
    });

    // Không gửi lại transaction tại đây.
    // Cần kiểm tra transaction hash trên blockchain trước khi retry.
    throw error;
  }

  if (!receipt) {
    throw new Error(
      `Không nhận được transaction receipt: ${tx.hash}`
    );
  }

  if (receipt.status !== 1) {
    throw new Error(
      `Giao dịch mint NFT thất bại: ${tx.hash}`
    );
  }

  let tokenId = null;

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !==
      contractAddress.toLowerCase()
    ) {
      continue;
    }

    try {
      const parsedLog = iface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!parsedLog || parsedLog.name !== "Transfer") {
        continue;
      }

      const from = parsedLog.args.from;
      const to = parsedLog.args.to;
      const currentTokenId = parsedLog.args.tokenId;

      // Chỉ lấy Transfer event của quá trình mint:
      // from = address(0)
      // to = recipient thực tế
      if (
        from.toLowerCase() === ethers.ZeroAddress.toLowerCase() &&
        to.toLowerCase() === expectedRecipient.toLowerCase()
      ) {
        tokenId = currentTokenId.toString();
        break;
      }
    } catch (error) {
      // Bỏ qua log không parse được.
    }
  }

  if (!tokenId) {
    throw new Error(
      `Transaction thành công nhưng không tìm thấy tokenId: ${tx.hash}`
    );
  }

  console.log("=================================");
  console.log("Mint NFT confirmed");
  console.log("Recipient:", expectedRecipient);
  console.log("Token ID:", tokenId);
  console.log("Transaction hash:", tx.hash);
  console.log("Block number:", receipt.blockNumber);
  console.log("=================================");

  return {
    tokenId,
    receipt,
    txHash: tx.hash,
    recipient: expectedRecipient,
  };
}

// ===============================
// 5. Export
// ===============================

module.exports = {
  contract,
  provider,
  wallet,
  mintTicket,
  waitForMint,
};
