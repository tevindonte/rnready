import { writeFile, unlink, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";

const MAX_BYTES = 20 * 1024 * 1024;

function runPythonExtract(scriptPath: string, filePath: string): Promise<string> {
  const python = process.platform === "win32" ? "python" : "python3";
  return new Promise((resolve, reject) => {
    const proc = spawn(python, [scriptPath, filePath], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0 && stdout.trim()) resolve(stdout.trim());
      else reject(new Error(stderr || "Failed to extract text from file"));
    });
  });
}

export async function extractTextFromUpload(
  buffer: Buffer,
  filename: string
): Promise<{ text: string; sourceType: "pdf" | "pptx" | "docx" | "txt" }> {
  if (buffer.length > MAX_BYTES) {
    throw new Error("File too large. Maximum 20 MB.");
  }

  const ext = filename.toLowerCase().split(".").pop();
  if (!ext || !["pdf", "pptx", "docx", "txt"].includes(ext)) {
    throw new Error("Unsupported file type. Use .pdf, .pptx, .docx, or .txt");
  }

  if (ext === "txt") {
    return { text: buffer.toString("utf-8"), sourceType: "txt" };
  }

  const dir = await mkdtemp(join(tmpdir(), "rnready-upload-"));
  const filePath = join(dir, `upload.${ext}`);
  await writeFile(filePath, buffer);

  try {
    const scriptPath = join(process.cwd(), "pipeline", "extract_upload_cli.py");
    const text = await runPythonExtract(scriptPath, filePath);
    return { text, sourceType: ext as "pdf" | "pptx" | "docx" };
  } finally {
    await unlink(filePath).catch(() => {});
  }
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

export async function fetchYouTubeTranscript(url: string): Promise<string> {
  const { YoutubeTranscript } = await import("youtube-transcript");
  const videoId = extractYouTubeId(url);
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  return segments.map((s) => s.text).join(" ");
}

function extractYouTubeId(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.includes("youtube") && !trimmed.includes("youtu.be")) {
    return trimmed;
  }
  const parsed = new URL(trimmed);
  if (parsed.hostname.includes("youtu.be")) {
    return parsed.pathname.slice(1).split("/")[0];
  }
  return parsed.searchParams.get("v") ?? trimmed;
}

export async function fetchWebpageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RNReadyBot/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function resolveSourceText(input: {
  notes?: string;
  url?: string;
  file?: { buffer: Buffer; filename: string };
}): Promise<{ text: string; sourceType: string }> {
  if (input.file) {
    const { text, sourceType } = await extractTextFromUpload(input.file.buffer, input.file.filename);
    return { text, sourceType };
  }
  if (input.url?.trim()) {
    const url = input.url.trim();
    if (isYouTubeUrl(url)) {
      const text = await fetchYouTubeTranscript(url);
      return { text, sourceType: "youtube" };
    }
    const text = await fetchWebpageText(url);
    return { text, sourceType: "web" };
  }
  if (input.notes?.trim()) {
    return { text: input.notes.trim(), sourceType: "text" };
  }
  throw new Error("No content provided");
}

export function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
