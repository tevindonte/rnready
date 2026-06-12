import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, exam_date, complete_onboarding, email_opt_out } = body as {
    name?: string;
    exam_date?: string | null;
    complete_onboarding?: boolean;
    email_opt_out?: boolean;
  };

  const updates: {
    name?: string;
    exam_date?: string | null;
    onboarding_completed_at?: string;
    email_opt_out?: boolean;
  } = {};
  if (name !== undefined) updates.name = name;
  if (exam_date !== undefined) updates.exam_date = exam_date || null;
  if (complete_onboarding) updates.onboarding_completed_at = new Date().toISOString();
  if (email_opt_out !== undefined) updates.email_opt_out = email_opt_out;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, exam_date, onboarding_completed_at, subscription_status, email_opt_out")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ profile });
}
