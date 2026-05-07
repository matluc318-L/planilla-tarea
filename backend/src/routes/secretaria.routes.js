import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRoles } from "../middlewares/roles.middleware.js";
import * as secretariaController from "../controllers/secretaria.controller.js";

const r = Router();

r.use(requireAuth, requireRoles("SECRETARIA", "RRHH"));

r.get("/usuarios-planilla", asyncHandler(secretariaController.listPlanillaUsers));
r.post("/usuarios-planilla", asyncHandler(secretariaController.createPlanillaUser));
r.put("/usuarios-planilla/:id", asyncHandler(secretariaController.updatePlanillaUser));
r.delete("/usuarios-planilla/:id", asyncHandler(secretariaController.deletePlanillaUser));

export default r;

