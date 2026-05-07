import api from "./api.js";

export function listEmpleados(params) {
  return api.get("/empleados", { params }).then((r) => r.data);
}

export function getEmpleado(id) {
  return api.get(`/empleados/${id}`).then((r) => r.data);
}

export function createEmpleado(form, fotoFile) {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  if (fotoFile) fd.append("foto", fotoFile);
  return api
    .post("/empleados", fd, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
}

export function updateEmpleado(id, form, fotoFile) {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  if (fotoFile) fd.append("foto", fotoFile);
  return api
    .put(`/empleados/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
}

export function deleteEmpleado(id) {
  return api.delete(`/empleados/${id}`);
}
