import { Resend } from 'resend';
import { env } from '../env.js';

export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured on the server.');
  }
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html
  });
}
