const axios = require("axios");

async function sendLog() {
  try {
    const res = await axios.post(
      "https://prd-p-10ndb.splunkcloud.com:8088/services/collector",
      {
        event: {
          message: "Hello Splunk from Quynh via NodeJS",
        },
        index: "web_logs",
        sourcetype: "json"
      },
      {
        headers: {
          Authorization: "Splunk 2465944f-e35d-492d-9bdd-9538934686f1",
          "Content-Type": "application/json"
        },
        httpsAgent: new (require("https").Agent)({
          rejectUnauthorized: false   // BỎ QUA SSL — phù hợp khi test
        })
      }
    );

    console.log("Splunk response:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

sendLog();
