import twilio from 'twilio';
import { env } from '../env.js';

const client =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;

export async function sendSms(params: { to: string; body: string }) {
  if (!client || !env.TWILIO_FROM_NUMBER) {
    throw new Error('Twilio credentials are not configured on the server.');
  }
  return client.messages.create({
    to: params.to,
    from: env.TWILIO_FROM_NUMBER,
    body: params.body
  });
}
