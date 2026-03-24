import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  fromName,
  fromEmail,
  subject,
  html,
  text,
}: {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  html: string;
  text: string;
}) {
  return resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    html,
    text,
  });
}
