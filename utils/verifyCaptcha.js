require("dotenv").config();
const axios = require("axios");

async function verifyCaptcha(token, remoteip) {
  // Nếu bật bypass khi test local
  if (String(process.env.BYPASS_CAPTCHA).toLowerCase() === "true") {
    console.log("Bypass captcha enabled");
    return true;
  }

  if (!token) return false;

  try {
    const params = new URLSearchParams();
    params.append("secret", process.env.CLOUDFLARE_SECRET_KEY);
    params.append("response", token);
    if (remoteip) params.append("remoteip", remoteip);

    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log("Turnstile verify result:", response.data);
    return response.data.success === true;
  } catch (err) {
    console.error("Captcha verify failed:", err.response?.data || err.message);
    return false;
  }
}

module.exports = verifyCaptcha;
