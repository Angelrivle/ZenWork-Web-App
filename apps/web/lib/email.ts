import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporterPromise: Promise<Transporter | null> | null = null;

function getTransporter(): Promise<Transporter | null> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const host = process.env.ZENWORK_SMTP_HOST;
    const port = Number(process.env.ZENWORK_SMTP_PORT) || 587;
    const user = process.env.ZENWORK_SMTP_USER;
    const pass = process.env.ZENWORK_SMTP_PASS;
    const from = process.env.ZENWORK_SMTP_FROM || "ZenWork <no-reply@zenwork.app>";

    if (!host || !user || !pass) {
      console.warn("[email] SMTP no configurado (ZENWORK_SMTP_HOST/USER/PASS). El email no se enviará.");
      return null;
    }

    const transporter = nodemailer.createTransport(
      {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      },
      { from }
    );

    try {
      await transporter.verify();
    } catch (error) {
      console.error("[email] No se pudo conectar con el SMTP:", error);
      return null;
    }

    return transporter;
  })();

  return transporterPromise;
}

export interface InvitationEmailParams {
  to: string;
  orgName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}

export async function sendInvitationEmail({
  to,
  orgName,
  inviterName,
  role,
  inviteUrl,
}: InvitationEmailParams) {
  const transporter = await getTransporter();
  if (!transporter) return false;

  const safeOrgName = escapeHtml(orgName);
  const safeInviter = escapeHtml(inviterName);
  const safeRole = escapeHtml(role);
  const safeUrl = escapeHtml(inviteUrl);

  const plainText = `Hola,

${inviterName} te ha invitado a unirte a "${orgName}" con el rol de ${role} en ZenWork.

Para aceptar la invitación y acceder a tu espacio de trabajo, abre el siguiente enlace en tu navegador:
${inviteUrl}

Esta invitación estará disponible durante los próximos 7 días. Si no esperabas recibir esta invitación, puedes ignorar este mensaje.

Atentamente,
El equipo de ZenWork
https://workspace.zenforge.online`;

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a ${safeOrgName} en ZenWork</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0d0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0d0e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #121415; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 32px; height: 32px; background-color: #2563eb; border-radius: 6px; text-align: center; vertical-align: middle; color: #ffffff; font-size: 18px; font-weight: 800; font-family: monospace;">Z</td>
                        <td style="padding-left: 12px; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">ZenWork</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="font-family: monospace; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; padding: 4px 8px; background-color: rgba(255, 255, 255, 0.04); border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.08);">INVITACIÓN</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h1 style="margin: 0 0 16px; color: #f3f4f6; font-size: 22px; font-weight: 600; line-height: 1.3;">
                Has sido invitado a colaborar
              </h1>
              
              <p style="margin: 0 0 24px; color: #9ca3af; font-size: 15px; line-height: 1.6;">
                <strong style="color: #e5e7eb;">${safeInviter}</strong> te ha invitado a formar parte de la organización <strong style="color: #60a5fa;">${safeOrgName}</strong> en ZenWork.
              </p>

              <!-- Role Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #181b1c; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 11px; font-family: monospace; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Rol asignado</div>
                    <div style="font-size: 15px; color: #3b82f6; font-weight: 600;">${safeRole}</div>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #2563eb; color: #ffffff !important; text-decoration: none; text-align: center; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 8px; border: 1px solid #3b82f6;">
                      Aceptar invitación y acceder
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                O si prefieres, copia y pega este enlace directo en tu navegador:
              </p>
              <p style="margin: 0; word-break: break-all; font-family: monospace; font-size: 12px; color: #60a5fa; line-height: 1.4;">
                <a href="${safeUrl}" style="color: #60a5fa; text-decoration: underline;">${safeUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0e1011; border-top: 1px solid rgba(255, 255, 255, 0.04); text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Esta invitación expira automáticamente en 7 días. Si no esperabas recibirla, puedes desestimar este mensaje.
              </p>
              <p style="margin: 0; color: #4b5563; font-size: 11px;">
                © ${new Date().getFullYear()} ZenWork — Plataforma Unificada de Productividad y Colaboración.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      to,
      subject: `Invitación para unirte a ${orgName} en ZenWork`,
      text: plainText,
      html: htmlContent,
      headers: {
        "X-Entity-Ref-ID": `invite-${Date.now()}`,
      },
    });
  } catch (error) {
    console.error("[email] Error enviando invitación a", to, ":", error);
    return false;
  }

  console.log("[email] Invitación enviada a", to);
  return true;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}