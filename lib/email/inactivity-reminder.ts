import { createAdminClient } from "@/lib/supabase/admin";
import { sendZeptoMail, isZeptoMailConfigured } from "@/lib/email/zeptomail";

const INACTIVITY_DAYS = 3;
const REMINDER_COOLDOWN_DAYS = 4;

type InactivityResult = {
  sent: number;
  skipped: number;
  errors: string[];
};

export async function sendInactivityReminders(): Promise<InactivityResult> {
  if (!isZeptoMailConfigured()) {
    throw new Error("ZeptoMail not configured");
  }

  const admin = createAdminClient();
  const inactivityCutoff = new Date();
  inactivityCutoff.setDate(inactivityCutoff.getDate() - INACTIVITY_DAYS);

  const reminderCutoff = new Date();
  reminderCutoff.setDate(reminderCutoff.getDate() - REMINDER_COOLDOWN_DAYS);

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, name, exam_date, last_session_at, last_reminder_sent")
    .eq("email_opt_out", false)
    .not("last_session_at", "is", null)
    .lt("last_session_at", inactivityCutoff.toISOString());

  if (error) throw new Error(error.message);

  const result: InactivityResult = { sent: 0, skipped: 0, errors: [] };

  for (const profile of profiles ?? []) {
    if (
      profile.last_reminder_sent &&
      new Date(profile.last_reminder_sent) > reminderCutoff
    ) {
      result.skipped += 1;
      continue;
    }

    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    if (!email) {
      result.skipped += 1;
      continue;
    }

    const examDays = profile.exam_date
      ? Math.ceil(
          (new Date(profile.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : null;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const name = profile.name || "there";
    const examLine =
      examDays !== null && examDays > 0
        ? `<p>Your exam is in <strong>${examDays} day${examDays === 1 ? "" : "s"}</strong>.</p>`
        : "";

    try {
      await sendZeptoMail({
        to: { email, name: profile.name ?? undefined },
        subject: "Pick up where you left off — RNReady",
        html: `
          <p>Hi ${name},</p>
          <p>Haven't studied in a few days? A short session now keeps your readiness on track.</p>
          ${examLine}
          <p><a href="${appUrl}/quiz/config">Continue studying →</a></p>
          <p style="color:#64748b;font-size:12px;">You're receiving this because you have an RNReady account.
          <a href="${appUrl}/settings">Manage email preferences</a></p>
        `,
      });

      await admin
        .from("profiles")
        .update({ last_reminder_sent: new Date().toISOString() })
        .eq("id", profile.id);

      result.sent += 1;
    } catch (err) {
      result.errors.push(
        `${email}: ${err instanceof Error ? err.message : "send failed"}`
      );
    }
  }

  return result;
}
