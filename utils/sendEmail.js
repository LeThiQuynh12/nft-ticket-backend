// utils/sendEmail.js
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html) {
  try {
    const data = await resend.emails.send({
      from: "Ticket <noreply@ticketqq.online>",
      to,
      subject,
      html,
    });

    console.log("Email sent:", data);
    return data;
  } catch (err) {
    console.error("Send email error:", err);
    throw new Error("Cannot send email");
  }
}

module.exports = sendEmail;
