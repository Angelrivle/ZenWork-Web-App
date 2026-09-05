import { Resend } from "resend";
import { EMAIL_CONFIG } from "@zenwork/shared";

// ============================================================
// EMAIL ADAPTER (Resend)
// ============================================================

// Cliente lazy: no se crea en import para no romper el arranque
// si ZENWORK_RESEND_API_KEY no está configurado (ej. local sin email).
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.ZENWORK_RESEND_API_KEY);
  }
  return resend;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!process.env.ZENWORK_RESEND_API_KEY) {
    console.warn(
      "ZENWORK_RESEND_API_KEY no configurado. Email no enviado:",
      options.subject
    );
    return false;
  }

  try {
    await getResendClient().emails.send({
      from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// ============================================================
// EMAIL TEMPLATES
// ============================================================

export function invitationEmailTemplate(
  inviterName: string,
  orgName: string,
  inviteUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitación a ZenWork</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #6366f1; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ZenWork</h1>
        </div>
        <div class="content">
          <h2>Has sido invitado a ZenWork</h2>
          <p><strong>${inviterName}</strong> te ha invitado a unirse a la organización <strong>${orgName}</strong> en ZenWork.</p>
          <p>Para aceptar la invitación y empezar a colaborar, haz clic en el botón:</p>
          <a href="${inviteUrl}" class="button">Aceptar invitación</a>
          <p style="color: #666; font-size: 14px;">Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:<br>${inviteUrl}</p>
          <p style="color: #999; font-size: 12px;">Esta invitación expira en 7 días.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ZenWork. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function passwordResetEmailTemplate(
  resetUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer contraseña - ZenWork</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #6366f1; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ZenWork</h1>
        </div>
        <div class="content">
          <h2>Restablecer tu contraseña</h2>
          <p>Has solicitado restablecer tu contraseña en ZenWork.</p>
          <p>Haz clic en el botón para crear una nueva contraseña:</p>
          <a href="${resetUrl}" class="button">Restablecer contraseña</a>
          <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
          <p style="color: #999; font-size: 12px;">Este enlace expira en 1 hora.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ZenWork. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
