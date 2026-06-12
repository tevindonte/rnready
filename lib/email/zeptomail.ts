type ZeptoMailRecipient = {
  email: string;
  name?: string;
};

type SendEmailOptions = {
  to: ZeptoMailRecipient;
  subject: string;
  html: string;
  text?: string;
};

export async function sendZeptoMail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY;
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
  const fromName = process.env.ZEPTOMAIL_FROM_NAME ?? "RNReady";

  if (!apiKey || !fromEmail) {
    throw new Error("ZeptoMail is not configured (ZEPTOMAIL_API_KEY, ZEPTOMAIL_FROM_EMAIL)");
  }

  const res = await fetch("https://api.zeptomail.com/v1.1/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-enczapikey ${apiKey}`,
    },
    body: JSON.stringify({
      from: { address: fromEmail, name: fromName },
      to: [
        {
          email_address: {
            address: options.to.email,
            name: options.to.name ?? options.to.email,
          },
        },
      ],
      subject: options.subject,
      htmlbody: options.html,
      textbody: options.text ?? options.html.replace(/<[^>]+>/g, " "),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ZeptoMail send failed (${res.status}): ${body}`);
  }
}

export function isZeptoMailConfigured(): boolean {
  return Boolean(process.env.ZEPTOMAIL_API_KEY && process.env.ZEPTOMAIL_FROM_EMAIL);
}
