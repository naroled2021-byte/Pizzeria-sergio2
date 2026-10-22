import path from "node:path";

// Carpeta donde se guardan las imágenes subidas. En el VPS conviene apuntarla
// a una ruta fija fuera del proyecto (ej. /var/www/pizzeria-uploads) para que
// no se pierdan al redeployar.
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"));

export const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
