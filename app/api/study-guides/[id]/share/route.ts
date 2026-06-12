import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateShareCode } from "@/lib/study-guide-sources";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: guide } = await supabase
    .from("study_guides")
    .select("id, is_public, share_code")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .single();

  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPublic = !guide.is_public;
  const shareCode = guide.share_code ?? generateShareCode();

  const { error } = await supabase
    .from("study_guides")
    .update({ is_public: isPublic, share_code: shareCode })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ is_public: isPublic, share_code: shareCode });
}
