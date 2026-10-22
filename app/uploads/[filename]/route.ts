import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { IMAGE_CONTENT_TYPES, UPLOAD_DIR } from "@/lib/uploads";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  // Solo nombres planos (sin "/" ni "..") para no salir de la carpeta de uploads.
  if (filename !== path.basename(filename)) {
    return new Response("Not found", { status: 404 });
  }
  const contentType = IMAGE_CONTENT_TYPES[path.extname(filename).toLowerCase()];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(path.join(UPLOAD_DIR, filename));
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        // Los nombres son UUID y nunca se sobrescriben, se puede cachear para siempre.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
