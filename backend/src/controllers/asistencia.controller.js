import * as asistenciaService from "../services/asistencia.service.js";

export async function entrada(req, res) {
  const row = await asistenciaService.registrarEntrada(req.user, req.body);
  res.status(201).json(row);
}

export async function salida(req, res) {
  const row = await asistenciaService.registrarSalida(req.user, req.body);
  res.json(row);
}

export async function ausencia(req, res) {
  const row = await asistenciaService.marcarAusencia(req.user, req.body);
  res.status(201).json(row);
}

export async function list(req, res) {
  const rows = await asistenciaService.listAsistencias(req.query, req.user);
  res.json(rows);
}

export async function resumen(req, res) {
  const data = await asistenciaService.dashboardAsistenciaResumen(req.user);
  res.json(data);
}
