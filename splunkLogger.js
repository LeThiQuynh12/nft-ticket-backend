// splunkLogger.js
const axios = require("axios");
const https = require("https");

const SPLUNK_HEC_URL = process.env.SPLUNK_HEC_URL; // ví dụ: https://prd-p-10ndb.splunkcloud.com:8088/services/collector
const SPLUNK_TOKEN = process.env.SPLUNK_TOKEN; // ví dụ: 2465944f-e35d-492d-9bdd-9538934686f1
const SPLUNK_INDEX = process.env.SPLUNK_INDEX || "web_logs";
const SPLUNK_SOURCETYPE = "json";

const httpsAgent = new https.Agent({ rejectUnauthorized: false }); // bỏ qua SSL test

async function sendLog(eventObj) {
  try {
    const payload = {
      index: SPLUNK_INDEX,
      sourcetype: SPLUNK_SOURCETYPE,
      event: eventObj,
    };

    const res = await axios.post(SPLUNK_HEC_URL, payload, {
      headers: {
        Authorization: `Splunk ${SPLUNK_TOKEN}`,
        "Content-Type": "application/json",
      },
      httpsAgent,
    });

    console.log("Splunk log sent:", res.data);
  } catch (err) {
    console.error("Error sending log to Splunk:", err.response?.data || err.message);
  }
}

module.exports = { sendLog };
