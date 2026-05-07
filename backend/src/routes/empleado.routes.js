import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRoles } from "../middlewares/roles.middleware.js";
import { uploadFotoEmpleado } from "../middlewares/upload.middleware.js";
import * as empleadoController from "../controllers/empleado.controller.js";

const r = Router();

r.use(requireAuth);

r.get("/", asyncHandler(empleadoController.list));
r.get("/:id", asyncHandler(empleadoController.getOne));

r.post(
  "/",
  requireRoles("ADMIN", "RRHH"),
  uploadFotoEmpleado.single("foto"),
  asyncHandler(empleadoController.create)
);

r.put(
  "/:id",
  requireRoles("ADMIN", "RRHH"),
  uploadFotoEmpleado.single("foto"),
  asyncHandler(empleadoController.update)
);

r.delete("/:id", requireRoles("ADMIN", "RRHH"), asyncHandler(empleadoController.remove));

export default r;
