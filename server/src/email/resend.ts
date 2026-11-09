const RESEND_API_URL = 'https://api.resend.com/emails';

export class EmailError extends Error {}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function verificationEmailHtml(name: string, verifyUrl: string): string {
  const safeName = escapeHtml(name);
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#150a2b;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#150a2b;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#241548;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
            <tr>
              <td style="padding:36px 32px 8px;text-align:center;">
                <div style="font-size:42px;line-height:1;">🧩</div>
                <h1 style="margin:12px 0 0;color:#f5f3ff;font-size:22px;">Social<span style="color:#facc15;">Quizz</span></h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;color:#f5f3ff;">
                <p style="font-size:16px;margin:0 0 12px;">¡Hola, ${safeName}!</p>
                <p style="font-size:15px;line-height:1.5;color:#c9bfe0;margin:0 0 24px;">
                  Confirma tu email para activar tu cuenta y empezar a jugar con tus amigos.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;text-align:center;">
                <a href="${verifyUrl}" style="display:inline-block;background:#facc15;color:#1b1035;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:999px;">
                  ✅ Verificar mi cuenta
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="font-size:12.5px;color:#8b7fa8;line-height:1.5;margin:0;">
                  Si el botón no funciona, copia este enlace en tu navegador:<br />
                  <a href="${verifyUrl}" style="color:#8b5cf6;word-break:break-all;">${verifyUrl}</a>
                </p>
                <p style="font-size:12.5px;color:#8b7fa8;margin:16px 0 0;">
                  Este enlace caduca en 24 horas. Si no has creado tú esta cuenta, puedes ignorar este correo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Envía el email de verificación mediante la API de Resend (una simple llamada HTTPS, sin SDK).
 * Si no hay RESEND_API_KEY configurada, no lanza error: avisa por consola y registra el enlace,
 * para poder seguir probando el flujo completo en desarrollo sin una cuenta de email real.
 */
export async function sendVerificationEmail(to: string, name: string, verifyUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY no configurada: no se envía email real a ${to}.\n` +
        `[email] Enlace de verificación (solo visible en los logs del servidor): ${verifyUrl}`,
    );
    return;
  }
  const from = process.env.EMAIL_FROM || 'SocialQuizz <onboarding@resend.dev>';
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: '✨ Verifica tu cuenta de SocialQuizz',
      html: verificationEmailHtml(name, verifyUrl),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new EmailError(`Resend respondió ${res.status}: ${text}`);
  }
}
