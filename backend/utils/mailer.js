import nodemailer from "nodemailer";

export function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMfaCodeEmail({ to, code }) {
  const transporter = makeTransport();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Your Zootopia verification code",
    text: `Your verification code is: ${code}\nThis code expires in 10 minutes.`,
  });
}
