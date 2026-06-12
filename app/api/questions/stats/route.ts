import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getQuestionBankStats } from "@/lib/question-bank";

export async function GET() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stats = await getQuestionBankStats(admin, user ? supabase : null);
  return NextResponse.json(stats);
}
