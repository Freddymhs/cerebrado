import { NextRequest, NextResponse } from "next/server";
import { writeFile, appendFile, mkdir } from "fs/promises";
import { join } from "path";

const LOG_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOG_DIR, "analysis.log");

let freshSession = true;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider, mode, summary, success, error } = body;

  const timestamp = new Date().toISOString();
  const line = JSON.stringify({ timestamp, provider, mode, summary, success, error }) + "\n";

  try {
    await mkdir(LOG_DIR, { recursive: true });
    if (freshSession) {
      await writeFile(LOG_FILE, line, "utf8");
      freshSession = false;
    } else {
      await appendFile(LOG_FILE, line, "utf8");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Log write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
