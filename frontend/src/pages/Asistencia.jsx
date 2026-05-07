import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import * as asistenciaApi from "../services/asistencia.api.js";
import * as empleadosApi from "../services/empleados.api.js";
import Modal from "../components/Modal.jsx";
import Spinner from "../components/Spinner.jsx";

export default function Asistencia() {
  const { user } = useAuth();
  const isStaff = user?.rol === "ADMIN" || user?.rol === "RRHH";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [empId, setEmpId] = useState("");
  const [empleados, setEmpleados] = useState([]);
  const [ausOpen, setAusOpen] = useState(false);
  const [ausForm, setAusForm] = useState({ empleadoId: "", fecha: "", notas: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (empId && isStaff) params.empleadoId = empId;
      const data = await asistenciaApi.listAsistencia(params);
      setRows(data);
      if (isStaff) {
        try {
          const r = await asistenciaApi.resumenAsistencia();
          setResumen(r);
        } catch {
          setResumen(null);
        }
      }
    } catch (e) {
      setError(e.response?.data?.error || "Error al cargar asistencia");
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, empId, isStaff]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isStaff) return;
    empleadosApi.listEmpleados({ limit: 200 }).then((r) => setEmpleados(r.data || []));
  }, [isStaff]);

  async function marcarEntrada() {
    if (isStaff && !empId) {
      setError("Selecciona un empleado en el filtro para marcar entrada/salida.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await asistenciaApi.entrada(isStaff ? { empleadoId: empId } : {});
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo registrar entrada");
    } finally {
      setBusy(false);
    }
  }

  async function marcarSalida() {
    if (isStaff && !empId) {
      setError("Selecciona un empleado en el filtro para marcar entrada/salida.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await asistenciaApi.salida(isStaff ? { empleadoId: empId } : {});
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo registrar salida");
    } finally {
      setBusy(false);
    }
  }

  async function guardarAusencia() {
    setBusy(true);
    setError("");
    try {
      await asistenciaApi.ausencia(ausForm);
      setAusOpen(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo registrar ausencia");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Asistencia</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Control de entradas, salidas y ausencias
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={marcarEntrada}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Marcar entrada
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={marcarSalida}
            className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60 dark:bg-slate-700"
          >
            Marcar salida
          </button>
          {isStaff ? (
            <button
              type="button"
              onClick={() => setAusOpen(true)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
            >
              Registrar ausencia
            </button>
          ) : null}
        </div>
      </div>

      {isStaff && resumen ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Asistencia hoy</p>
            <p className="text-2xl font-bold">{resumen.porcentajeAsistencia}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Puntuales</p>
            <p className="text-2xl font-bold">{resumen.puntualesHoy}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Tardíos</p>
            <p className="text-2xl font-bold">{resumen.tardiosHoy}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">Presentes</p>
            <p className="text-2xl font-bold">{resumen.presentesHoy}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        {isStaff ? (
          <select
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Todos los empleados</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombres} {e.apellidos}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-brand-600 text-white text-sm font-semibold py-2"
        >
          Aplicar filtros
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-4 py-3">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-left">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Tardanza</th>
                  <th className="px-4 py-3">Entrada</th>
                  <th className="px-4 py-3">Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{r.fecha}</td>
                      <td className="px-4 py-3">
                        {r.nombres} {r.apellidos}
                      </td>
                      <td className="px-4 py-3">{r.estado}</td>
                      <td className="px-4 py-3">{r.minutosTardanza} min</td>
                      <td className="px-4 py-3 text-xs">{r.entradaAt ? new Date(r.entradaAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-xs">{r.salidaAt ? new Date(r.salidaAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={ausOpen}
        onClose={() => !busy && setAusOpen(false)}
        title="Registrar ausencia"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setAusOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={guardarAusencia}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Guardar
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Empleado</label>
            <select
              required
              value={ausForm.empleadoId}
              onChange={(e) => setAusForm((f) => ({ ...f, empleadoId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Selecciona</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombres} {e.apellidos}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Fecha</label>
            <input
              type="date"
              required
              value={ausForm.fecha}
              onChange={(e) => setAusForm((f) => ({ ...f, fecha: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notas</label>
            <textarea
              value={ausForm.notas}
              onChange={(e) => setAusForm((f) => ({ ...f, notas: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
