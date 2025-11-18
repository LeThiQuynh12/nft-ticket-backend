const axios = require("axios");

const GEETEST_KEY = process.env.GEETEST_KEY; // secret key

async function verifyGeetest({ geetest_challenge, geetest_validate, geetest_seccode }) {
  try {
    if (!geetest_challenge || !geetest_validate || !geetest_seccode) return false;

    // Gọi validate.php của GeeTest
    const url = "https://api.geetest.com/validate.php";
    const payload = new URLSearchParams({ seccode: geetest_seccode }).toString();

    const r = await axios.post(url, payload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 5000,
    });

    const body = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
    return body.includes(geetest_seccode); // true nếu validate pass
  } catch (err) {
    console.error("verifyGeetest error:", err.message || err);
    return false;
  }
}

module.exports = verifyGeetest;
