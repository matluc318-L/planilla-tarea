import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import * as empleadosApi from "../services/empleados.api.js";
import * as catalogosApi from "../services/catalogos.api.js";
import Modal from "../components/Modal.jsx";
import PaginationBar from "../components/PaginationBar.jsx";
import Spinner from "../components/Spinner.jsx";

const empty = {
  nombres: "",
  apellidos: "",
  dni: "",
  correo: "",
  telefono: "",
  direccion: "",
  cargoId: "",
  areaId: "",
  salario: "",
  fechaIngreso: "",
  estado: "ACTIVO",
};

export default function Empleados() {
  const { user } = useAuth();
  const canEdit = user?.rol === "ADMIN" || user?.rol === "RRHH";

  const [q, setQ] = useState("");
  const dq = useDebounce(q, 300);
  const [areaId, setAreaId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [areas, setAreas] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [foto, setFoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await empleadosApi.listEmpleados({
        q: dq || undefined,
        areaId: areaId || undefined,
        page,
        limit: 10,
      });
      setData(res.data || []);
      setMeta(res.meta || null);
    } catch (e) {
      setError(e.response?.data?.error || "Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }, [dq, areaId, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    catalogosApi.getAreas().then(setAreas);
  }, []);

  useEffect(() => {
    catalogosApi.getCargos(form.areaId || undefined).then(setCargos);
  }, [form.areaId, modal]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setFoto(null);
    setModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      nombres: row.nombres,
      apellidos: row.apellidos,
      dni: row.dni,
      correo: row.correo,
      telefono: row.telefono,
      direccion: row.direccion || "",
      cargoId: row.cargoId || "",
      areaId: row.areaId || "",
      salario: String(row.salario),
      fechaIngreso: String(row.fechaIngreso).slice(0, 10),
      estado: row.estado,
    });
    setFoto(null);
    setModal(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, salario: form.salario, cargoId: form.cargoId || null, areaId: form.areaId || null };
      if (editing) {
        await empleadosApi.updateEmpleado(editing.id, payload, foto || undefined);
      } else {
        await empleadosApi.createEmpleado(payload, foto || undefined);
      }
      setModal(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setSaving(true);
    setError("");
    try {
      await empleadosApi.deleteEmpleado(delTarget.id);
      setDelTarget(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Empleados</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Directorio y expedientes</p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Nuevo empleado
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          placeholder="Buscar…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          value={areaId}
          onChange={(e) => {
            setPage(1);
            setAreaId(e.target.value);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
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
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">DNI</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Salario</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  data.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/app/empleados/${e.id}`} className="text-brand-600 hover:underline">
                          {e.nombres} {e.apellidos}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{e.dni}</td>
                      <td className="px-4 py-3">{e.areaNombre || "—"}</td>
                      <td className="px-4 py-3">{e.cargoNombre || "—"}</td>
                      <td className="px-4 py-3 tabular-nums">S/ {Number(e.salario).toFixed(2)}</td>
                      <td className="px-4 py-3">{e.estado}</td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <Link to={`/app/empleados/${e.id}`} className="text-brand-600 font-medium">
                          Ver
                        </Link>
                        {canEdit ? (
                          <>
                            <button type="button" className="text-brand-600 font-medium" onClick={() => openEdit(e)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="text-red-600 font-medium"
                              onClick={() => setDelTarget(e)}
                            >
                              Eliminar
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <PaginationBar meta={meta} onChange={setPage} />
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => !saving && setModal(false)}
        title={editing ? "Editar empleado" : "Nuevo empleado"}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {[
            ["nombres", "Nombres"],
            ["apellidos", "Apellidos"],
            ["dni", "DNI"],
            ["correo", "Correo"],
            ["telefono", "Teléfono"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                required
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Dirección</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Área</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={form.areaId}
              onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value, cargoId: "" }))}
            >
              <option value="">—</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Cargo</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={form.cargoId}
              onChange={(e) => setForm((f) => ({ ...f, cargoId: e.target.value }))}
            >
              <option value="">—</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Salario</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={form.salario}
              onChange={(e) => setForm((f) => ({ ...f, salario: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Fecha ingreso</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={form.fechaIngreso}
              onChange={(e) => setForm((f) => ({ ...f, fechaIngreso: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Estado</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
            >
              {["ACTIVO", "INACTIVO", "SUSPENDIDO"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Foto (JPG/PNG)</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full text-sm"
              onChange={(e) => setFoto(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(delTarget)}
        onClose={() => !saving && setDelTarget(null)}
        title="Eliminar empleado"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setDelTarget(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={confirmDelete}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Eliminar
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Eliminar a {delTarget?.nombres} {delTarget?.apellidos}? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
