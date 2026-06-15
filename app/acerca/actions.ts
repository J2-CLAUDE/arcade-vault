"use server";

import { Resend } from "resend";
import { buildContactEmail } from "@/lib/email";

type ContactForm = { name: string; email: string; msg: string };
type ContactResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendContactMessage(data: ContactForm): Promise<ContactResult> {
  const { name, email, msg } = data;

  if (!name.trim() || !email.trim() || !msg.trim()) {
    return { ok: false, error: "Todos los campos son obligatorios." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "El formato del correo no es válido." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !to) {
    return { ok: false, error: "Configuración de correo incompleta en el servidor." };
  }

  const resend = new Resend(apiKey);
  const { html, text } = buildContactEmail(data);

  try {
    const { error } = await resend.emails.send({
      from: "Arcade Vault <onboarding@resend.dev>",
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name.trim()}`,
      html,
      text,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: message };
  }
}
