import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getQuestionBankStats } from "@/lib/question-bank";
import { getMissedQuestionIds } from "@/lib/missed-questions";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stats = await getQuestionBankStats(admin, user ? supabase : null);

  let missedCount = 0;
  if (user) {
    const missed = await getMissedQuestionIds(user.id);
    missedCount = missed.length;
  }

  return NextResponse.json({ ...stats, missedCount });
}
