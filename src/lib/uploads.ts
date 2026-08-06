import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_BYTES = 15 * 1024 * 1024;

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export function getUploadDir() {
  return process.env.UPLOAD_DIR ?? UPLOAD_ROOT;
}

export async function saveUpload(file: File): Promise<{ storageKey: string; size: number }> {
  if (file.size > MAX_BYTES) {
    throw new Error("File too large (max 15MB)");
  }

  const dir = getUploadDir();
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const storageKey = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_ROOT, storageKey), buffer);

  return { storageKey, size: buffer.length };
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  const safeKey = path.basename(storageKey);
  return readFile(path.join(UPLOAD_ROOT, safeKey));
}

export async function deleteUpload(storageKey: string) {
  const safeKey = path.basename(storageKey);
  try {
    await unlink(path.join(UPLOAD_ROOT, safeKey));
  } catch {
    // file may already be gone
  }
}
