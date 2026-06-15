type ContactForm = { name: string; email: string; msg: string };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildContactEmail(data: ContactForm): { html: string; text: string } {
  const name = escapeHtml(data.name.trim());
  const email = escapeHtml(data.email.trim());
  const msg = escapeHtml(data.msg.trim());

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nuevo mensaje — Arcade Vault</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Courier New',Courier,monospace;">

<!-- outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;background-image:radial-gradient(ellipse 120% 60% at 50% 0%,rgba(255,0,110,0.10) 0%,transparent 60%),radial-gradient(ellipse 120% 60% at 50% 100%,rgba(0,245,255,0.12) 0%,transparent 60%);">
<tr><td align="center" style="padding:40px 16px;">

  <!-- card -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0f0f18;border:1px solid rgba(0,245,255,0.35);box-shadow:0 0 32px rgba(0,245,255,0.12);">

    <!-- terminal bar -->
    <tr>
      <td style="background:#08080d;border-bottom:1px solid rgba(0,245,255,0.18);padding:10px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width:60px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ff5f56;margin-right:5px;"></span>
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ffbd2e;margin-right:5px;"></span>
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#27c93f;"></span>
            </td>
            <td align="center" style="font-size:9px;letter-spacing:0.18em;color:#4a4f70;text-transform:uppercase;">
              VAULT-OS &nbsp;//&nbsp; NUEVO MENSAJE
            </td>
            <td style="width:60px;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- logo + header -->
    <tr>
      <td align="center" style="padding:36px 32px 28px;border-bottom:1px solid rgba(0,245,255,0.10);">
        <div style="font-size:26px;letter-spacing:0.12em;font-weight:700;line-height:1;">
          <span style="color:#00f5ff;text-shadow:0 0 14px rgba(0,245,255,0.8);">ARCADE</span>
          <span style="color:#e6e9ff;"> </span>
          <span style="color:#ff006e;text-shadow:0 0 14px rgba(255,0,110,0.8);">VAULT</span>
        </div>
        <div style="margin-top:14px;font-size:10px;letter-spacing:0.28em;color:#f5ff00;text-shadow:0 0 8px rgba(245,255,0,0.6);">
          &#9658;&nbsp;NUEVO MENSAJE DE CONTACTO
        </div>
      </td>
    </tr>

    <!-- fields -->
    <tr>
      <td style="padding:28px 32px 0;">

        <!-- nombre -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
          <tr>
            <td style="border-left:3px solid #00f5ff;padding:10px 14px;background:#0a0a0f;">
              <div style="font-size:9px;letter-spacing:0.2em;color:#4a4f70;margin-bottom:4px;text-transform:uppercase;">Nombre</div>
              <div style="font-size:14px;color:#00f5ff;text-shadow:0 0 6px rgba(0,245,255,0.5);">${name}</div>
            </td>
          </tr>
        </table>

        <!-- correo -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
          <tr>
            <td style="border-left:3px solid #ff006e;padding:10px 14px;background:#0a0a0f;">
              <div style="font-size:9px;letter-spacing:0.2em;color:#4a4f70;margin-bottom:4px;text-transform:uppercase;">Correo electrónico</div>
              <a href="mailto:${email}" style="font-size:14px;color:#ff006e;text-decoration:none;text-shadow:0 0 6px rgba(255,0,110,0.5);">${email}</a>
            </td>
          </tr>
        </table>

        <!-- mensaje -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td style="border-left:3px solid #f5ff00;padding:10px 14px;background:#0a0a0f;">
              <div style="font-size:9px;letter-spacing:0.2em;color:#4a4f70;margin-bottom:8px;text-transform:uppercase;">Mensaje</div>
              <div style="font-size:14px;color:#e6e9ff;line-height:1.7;white-space:pre-wrap;">${msg}</div>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- reply hint -->
    <tr>
      <td style="padding:0 32px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="border:1px solid rgba(0,245,255,0.15);background:#08080d;padding:12px 16px;">
              <div style="font-size:11px;color:#8a8fb5;line-height:1.6;">
                <span style="color:#00ff88;">&#9679;</span>&nbsp;
                Responde directamente a este correo para contestar a <strong style="color:#e6e9ff;">${name}</strong>.
                Tu respuesta irá a <span style="color:#ff006e;">${email}</span>.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- footer -->
    <tr>
      <td align="center" style="padding:16px 32px 28px;border-top:1px solid rgba(0,245,255,0.10);">
        <div style="font-size:9px;letter-spacing:0.18em;color:#4a4f70;text-transform:uppercase;">
          ARCADE VAULT &nbsp;&mdash;&nbsp; FORMULARIO DE CONTACTO
        </div>
        <div style="margin-top:8px;font-size:9px;color:#4a4f70;letter-spacing:0.10em;">
          Este mensaje fue enviado desde <span style="color:#8a8fb5;">arcade-vault.gg/acerca</span>
        </div>
      </td>
    </tr>

  </table>
  <!-- /card -->

</td></tr>
</table>
<!-- /outer wrapper -->

</body>
</html>`;

  const text = `ARCADE VAULT — Nuevo mensaje de contacto
==========================================

Nombre:  ${data.name.trim()}
Correo:  ${data.email.trim()}

Mensaje:
${data.msg.trim()}

--
Responde directamente a este correo para contestar a ${data.name.trim()}.
Enviado desde arcade-vault.gg/acerca
`;

  return { html, text };
}
