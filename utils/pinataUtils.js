const axios = require("axios");
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud/ipfs/";

function createMetadata(ticket) {
  return {
    name: `${ticket.ticketType} Ticket`,
    description: `Vé ${ticket.ticketType} cho sự kiện`,
    image: ticket.image || "ipfs://defaultImageCID",
    attributes: [
      { trait_type: "Zone", value: ticket.zone },
      { trait_type: "Seat", value: ticket.seat }
    ]
  };
}

async function uploadMetadataToPinata(metadata) {
  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          "Content-Type": "application/json"
        }
      }
    );
    return `${PINATA_GATEWAY_URL}${res.data.IpfsHash}`;
  } catch (err) {
    console.error("Upload metadata error:", err.response?.data || err.message);
    return null;
  }
}

module.exports = { createMetadata, uploadMetadataToPinata };
