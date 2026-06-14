import { promises as fs } from "fs";
import path from "path";
import { VMB_SAMPLE_BOOK_TEXT } from "@/lib/vmb/sample-book";

const SEED_CANDIDATE_PATHS = [
  "fixtures/vmb/book.csv",
  "public/uploads/book.csv",
  "runtime-data/vmb/demo/book.csv",
] as const;

export async function resolveVmbDemoSeedBookPath(): Promise<string | undefined> {
  const root = process.cwd();
  for (const relative of SEED_CANDIDATE_PATHS) {
    const full = path.join(root, relative);
    try {
      await fs.access(full);
      return relative;
    } catch {
      // try next candidate
    }
  }
  return undefined;
}

/** Load bundled demo book CSV text (50–100 clients when seed file present). */
export async function loadVmbDemoSeedBookText(): Promise<string> {
  const root = process.cwd();
  for (const relative of SEED_CANDIDATE_PATHS) {
    try {
      const text = await fs.readFile(path.join(root, relative), "utf8");
      if (text.trim()) return text;
    } catch {
      // try next candidate
    }
  }
  return VMB_SAMPLE_BOOK_TEXT;
}
