// blockchain/test.js
const { ethers } = require("ethers"); // <-- quên cái này là sai
const { mintTicket } = require("./connectNFT");

(async () => {
  try {
    const tokenId = await mintTicket(
      "0xE5ec2A6b7cBcf9e93F9D20d6267CbDf4F6A94d54",      // địa chỉ ví nhận NFT
      "VIP",
      "ST",
      "01",
      ethers.parseEther("0.001"), // giá trị price (đơn vị ETH)
      "ipfs://defaultMetadata"
    );
    console.log("Test minted tokenId:", tokenId);
  } catch (err) {
    console.error(err);
  }
})();
