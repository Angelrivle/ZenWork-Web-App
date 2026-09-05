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

  try {
    await transporter.sendMail({
      to,
      subject: `Invitación a ${orgName} en ZenWork`,
      html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111; margin-bottom: 8px;">Te invitaron a <strong>${escapeHtml(orgName)}</strong></h2>
        <p style="color: #444; line-height: 1.6;">
          <strong>${escapeHtml(inviterName)}</strong> te invitó a unirte como
          <strong>${escapeHtml(role)}</strong> en ZenWork.
        </p>
        <p style="color: #444; line-height: 1.6;">Hacé clic en el botón para aceptar tu invitación:</p>
        <p style="margin: 28px 0;">
          <a href="${escapeHtml(inviteUrl)}" style="display: inline-block; background: #0f766e; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Aceptar invitación
          </a>
        </p>
        <p style="color: #999; font-size: 13px;">Si no esperabas esta invitación, podés ignorar este correo.</p>
      </div>
    `,
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