const axios = require("axios");
const GEETEST_ID = process.env.GEETEST_ID;

exports.register = async (req, res) => {
  try {
    const r = await axios.get(`https://api.geetest.com/register.php?gt=${GEETEST_ID}&new_captcha=1`);
    // r.data là chuỗi challenge từ GeeTest
    res.json({
      success: 1,
      gt: GEETEST_ID,
      challenge: r.data, // challenge thật
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Register CAPTCHA failed" });
  }
};
