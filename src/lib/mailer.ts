import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587", 10),
  secure: parseInt(process.env.SMTP_PORT ?? "587", 10) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendSwiftEmailParams {
  to: string;
  recipientName: string;
  messageContent: string;
  workflowName: string;
  senderName: string;
}

export async function sendSwiftMT799Email({
  to,
  recipientName,
  messageContent,
  workflowName,
  senderName,
}: SendSwiftEmailParams): Promise<void> {
  const subject = `Private Equity Diligence Query | ${workflowName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Diligence Query Notification</h2>
      <p>Dear ${recipientName},</p>
      <p>
        Please find below a diligence query regarding private equity deal documents
        identified in workflow <strong>${workflowName}</strong>.
      </p>
      <hr style="border: 1px solid #e0e0e0; margin: 24px 0;" />
      <div style="
        background: #f9f9f9;
        border-left: 4px solid #2563eb;
        border-radius: 4px;
        padding: 20px 24px;
        margin: 0;
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.7;
        color: #1a1a1a;
        white-space: pre-wrap;
        word-break: break-word;
      ">${messageContent}</div>
      <hr style="border: 1px solid #e0e0e0; margin: 24px 0;" />
      <p style="color: #666; font-size: 12px;">
        This message was sent by ${senderName} via DealScan AI.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"DealScan AI" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// ── Ticket email ──────────────────────────────────────────────────────────────

interface SendTicketEmailParams {
  to: string;
  subject: string;
  body: string;
  workflowName: string;
  senderName: string;
}

export async function sendTicketEmail({
  to,
  subject,
  body,
  workflowName,
  senderName,
}: SendTicketEmailParams): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #e0e0e0; padding-bottom: 16px; margin-bottom: 24px;">
        <p style="font-size: 12px; color: #888; margin: 0;">DealScan AI · ${workflowName}</p>
      </div>
      <div style="
        font-size: 14px;
        line-height: 1.8;
        white-space: pre-wrap;
        word-break: break-word;
      ">${body}</div>
      <div style="border-top: 1px solid #e0e0e0; margin-top: 32px; padding-top: 16px;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          Sent by ${senderName} via DealScan AI.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"DealScan AI" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}
