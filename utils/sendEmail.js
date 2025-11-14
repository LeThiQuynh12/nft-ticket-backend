const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html) {
  try {
    const data = await resend.emails.send({
      from: "Ticket <noreply@ticketqq.online>",  // domain đã verify
      to: to,
      subject: subject,
      html: html,
    });
    console.log("Email sent:", data);
    return data;
  } catch (error) {
    console.error("Send email error:", error);
    throw new Error("Cannot send email");
  }
}

module.exports = sendEmail;
