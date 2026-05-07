import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env.js";

const dir = path.isAbsolute(env.uploadDir)
  ? path.join(env.uploadDir, "empleados")
  : path.resolve(process.cwd(), env.uploadDir, "empleados");

fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

export const uploadFotoEmpleado = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new Error("Solo imágenes JPG, PNG o WEBP"));
    }
    cb(null, true);
  },
});

export function uploadsPublicPath() {
  return path.isAbsolute(env.uploadDir) ? env.uploadDir : path.resolve(process.cwd(), env.uploadDir);
}
