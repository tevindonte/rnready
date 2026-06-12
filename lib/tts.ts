import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClient } from "@/lib/openai";

const BUCKET = "explanation-audio";

export type QuestionAudioPart = "question" | "explanation";

const AUDIO_COLUMNS: Record<QuestionAudioPart, "question_audio_url" | "explanation_audio_url"> = {
  question: "question_audio_url",
  explanation: "explanation_audio_url",
};

function storagePath(questionId: string, part: QuestionAudioPart): string {
  return part === "explanation" ? `${questionId}.mp3` : `${questionId}-question.mp3`;
}

export async function getOrCreateQuestionAudioUrl(
  questionId: string,
  part: QuestionAudioPart,
  text: string
): Promise<string> {
  const supabase = createAdminClient();
  const column = AUDIO_COLUMNS[part];

  const { data: existing } = await supabase
    .from("questions")
    .select("question_audio_url, explanation_audio_url")
    .eq("id", questionId)
    .single();

  const cachedUrl =
    part === "question" ? existing?.question_audio_url : existing?.explanation_audio_url;
  if (cachedUrl) {
    return cachedUrl;
  }

  const client = getOpenAIClient();
  const speech = await client.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text.slice(0, 4096),
  });

  const buffer = Buffer.from(await speech.arrayBuffer());
  const path = storagePath(questionId, part);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: "audio/mpeg",
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const audioUrl = publicUrl.publicUrl;

  await supabase
    .from("questions")
    .update({ [column]: audioUrl })
    .eq("id", questionId);

  return audioUrl;
}

/** @deprecated Use getOrCreateQuestionAudioUrl(id, "explanation", text) */
export async function getOrCreateExplanationAudioUrl(
  questionId: string,
  explanation: string
): Promise<string> {
  return getOrCreateQuestionAudioUrl(questionId, "explanation", explanation);
}
