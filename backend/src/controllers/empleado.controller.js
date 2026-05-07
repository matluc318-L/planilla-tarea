import path from "path";
import * as empleadoService from "../services/empleado.service.js";

function fotoUrl(fotoPath) {
  if (!fotoPath) return null;
  const base = path.basename(fotoPath);
  return `/uploads/empleados/${base}`;
}

export async function list(req, res) {
  const { data, meta } = await empleadoService.listEmpleados(req.query, req.user);
  const shaped = data.map((e) => ({ ...e, fotoUrl: fotoUrl(e.fotoPath) }));
  res.json({ data: shaped, meta });
}

export async function getOne(req, res) {
  const row = await empleadoService.getEmpleadoById(req.params.id, req.user);
  res.json({ ...row, fotoUrl: fotoUrl(row.fotoPath) });
}

export async function create(req, res) {
  const fotoPath = req.file ? req.file.path : null;
  const row = await empleadoService.createEmpleado(req.body, fotoPath, req.user);
  res.status(201).json({ ...row, fotoUrl: fotoUrl(row.fotoPath) });
}

export async function update(req, res) {
  const fotoPath = req.file ? req.file.path : undefined;
  const row = await empleadoService.updateEmpleado(req.params.id, req.body, fotoPath, req.user);
  res.json({ ...row, fotoUrl: fotoUrl(row.fotoPath) });
}

export async function remove(req, res) {
  await empleadoService.deleteEmpleado(req.params.id, req.user);
  res.status(204).send();
}
