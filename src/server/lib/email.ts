import nodemailer, { type Transporter } from "nodemailer";

/**
 * Generic SMTP sender. Defaults to Resend's SMTP endpoint, but because it's
 * plain SMTP you can point it at SES, Postmark, a self-hosted Postfix, etc.
 * by changing the SMTP_* env vars — no code change.
 *
 *   Resend:  host=smtp.resend.com  port=465  user=resend  pass=<API key>
 *
 * If SMTP_PASS is not set (e.g. local dev), emails are logged to the console
 * instead of sent, so verification/reset links are still clickable.
 */
const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
const host = process.env.SMTP_HOST ?? "smtp.resend.com";
const port = Number(process.env.SMTP_PORT ?? 465);
const user = process.env.SMTP_USER ?? "resend";
const pass = process.env.SMTP_PASS;

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // SSL on 465; STARTTLS on 587/2587
      auth: { user, pass },
    });
  }
  return transporter;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const tx = getTransporter();
  if (!tx) {
    console.log(
      `\n[email] SMTP not configured — would send:\n  to: ${to}\n  subject: ${subject}\n  ${text ?? html}\n`
    );
    return;
  }
  await tx.sendMail({ from, to, subject, html, text });
}

/** Escape text destined for HTML so interpolated user data can't inject markup. */
function esc(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

/** Minimal branded email shell. All text is HTML-escaped; pass user data freely. */
export function emailLayout(heading: string, body: string, cta?: { url: string; label: string }) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
    <h2 style="margin:0 0 12px">${esc(heading)}</h2>
    <p style="margin:0 0 20px;color:#444;line-height:1.5">${esc(body)}</p>
    ${
      cta
        ? `<a href="${encodeURI(cta.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${esc(cta.label)}</a>
    <p style="margin:20px 0 0;color:#888;font-size:12px;word-break:break-all">${esc(cta.url)}</p>`
        : ""
    }
  </div>`;
}
