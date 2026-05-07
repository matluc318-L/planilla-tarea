import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRoles } from "../middlewares/roles.middleware.js";
import * as asistenciaController from "../controllers/asistencia.controller.js";

const r = Router();

r.use(requireAuth);

r.post("/entrada", asyncHandler(asistenciaController.entrada));
r.post("/salida", asyncHandler(asistenciaController.salida));
r.post("/ausencia", requireRoles("ADMIN", "RRHH"), asyncHandler(asistenciaController.ausencia));

r.get("/", asyncHandler(asistenciaController.list));
r.get("/resumen", requireRoles("ADMIN", "RRHH"), asyncHandler(asistenciaController.resumen));

export default r;
