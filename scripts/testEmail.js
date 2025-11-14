require("dotenv").config(); // nếu bạn dùng .env để lưu API key
const sendEmail = require("../utils/sendEmail"); 

async function test() {
  try {
    const result = await sendEmail(
      "thuynguyennbt5@gmail.com",       
      "Test Email from Resend",
      "<h1>Hello!</h1><p>This is a test email.</p>"
    );
    console.log("Result:", result);
  } catch (err) {
    console.error("Error sending test email:", err);
  }
}

test();
