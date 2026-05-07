import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";
import { get, run, all } from "../db/index.js";
import { HttpError } from "../utils/httpError.js";

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      rol: user.rol,
      empleadoId: user.empleadoId,
      ownerAdminId: user.ownerAdminId,
    },
    env.jwtSecret,
    { expiresIn: "12h" }
  );
}

export async function register({ email, password }) {
  if (!email || !password || password.length < 6) {
    throw new HttpError(400, "Email y contraseña válidos requeridos (mín. 6 caracteres)");
  }
  const existing = await get(`SELECT id FROM usuarios WHERE email = ?`, [email.trim().toLowerCase()]);
  if (existing) {
    throw new HttpError(409, "El correo ya está registrado");
  }
  const countRow = await get(`SELECT COUNT(*) as c FROM usuarios`);
  const rol = countRow.c === 0 ? "ADMIN" : "RRHH";
  const id = randomUUID();
  let ownerAdminId = null;
  if (rol === "ADMIN") {
    ownerAdminId = id;
  } else {
    const firstAdmin = await get(
      `SELECT id FROM usuarios WHERE rol = 'ADMIN' ORDER BY datetime(createdAt) ASC LIMIT 1`
    );
    ownerAdminId = firstAdmin?.id || null;
  }
  const hash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();
  await run(
    `INSERT INTO usuarios (id, username, email, password, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt)
     VALUES (?, NULL, ?, ?, ?, NULL, NULL, ?, ?)`,
    [id, email.trim().toLowerCase(), hash, rol, ownerAdminId, createdAt]
  );
  const user = await get(
    `SELECT id, username, email, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt FROM usuarios WHERE id = ?`,
    [id]
  );
  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      rol: user.rol,
      empleadoId: user.empleadoId,
      planillaAccessUntil: user.planillaAccessUntil,
      ownerAdminId: user.ownerAdminId,
    },
  };
}

export async function login({ usuario, email, password }) {
  const identifier = (usuario ?? email ?? "").trim().toLowerCase();
  if (!identifier || !password) {
    throw new HttpError(400, "Usuario (o correo) y contraseña requeridos");
  }
  const byEmail = identifier.includes("@");
  const user = await get(
    byEmail ? `SELECT * FROM usuarios WHERE email = ?` : `SELECT * FROM usuarios WHERE username = ?`,
    [identifier]
  );
  if (!user) {
    throw new HttpError(401, "Credenciales incorrectas");
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new HttpError(401, "Credenciales incorrectas");
  }
  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      rol: user.rol,
      empleadoId: user.empleadoId,
      planillaAccessUntil: user.planillaAccessUntil,
      ownerAdminId: user.ownerAdminId,
    },
  };
}

export async function getMe(userId) {
  const user = await get(
    `SELECT id, username, email, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt FROM usuarios WHERE id = ?`,
    [userId]
  );
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return user;
}

/** Solo ADMIN: crea usuario con rol y opcional vínculo a empleado */
export async function createUserByAdmin(authUser, { email, password, rol, empleadoId }) {
  const allowed = ["ADMIN", "RRHH", "EMPLEADO", "SECRETARIA"];
  if (!allowed.includes(rol)) throw new HttpError(400, "Rol inválido");
  const existing = await get(`SELECT id FROM usuarios WHERE email = ?`, [email.trim().toLowerCase()]);
  if (existing) throw new HttpError(409, "El correo ya está registrado");
  if (empleadoId) {
    const emp = await get(`SELECT id FROM empleados WHERE id = ? AND ownerAdminId = ?`, [empleadoId, authUser.id]);
    if (!emp) throw new HttpError(404, "Empleado no encontrado");
    const taken = await get(`SELECT id FROM usuarios WHERE empleadoId = ?`, [empleadoId]);
    if (taken) throw new HttpError(409, "El empleado ya tiene usuario");
  }
  const id = randomUUID();
  const hash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();
  await run(
    `INSERT INTO usuarios (id, username, email, password, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt)
     VALUES (?, NULL, ?, ?, ?, ?, NULL, ?, ?)`,
    [id, email.trim().toLowerCase(), hash, rol, empleadoId || null, authUser.id, createdAt]
  );
  if (empleadoId && rol === "EMPLEADO") {
    await run(`UPDATE empleados SET updatedAt = ? WHERE id = ?`, [createdAt, empleadoId]);
  }
  return get(`SELECT id, username, email, rol, empleadoId, planillaAccessUntil, createdAt FROM usuarios WHERE id = ?`, [
    id,
  ]);
}

export async function listUsers(authUser) {
  const ownerAdminId = authUser.rol === "ADMIN" ? authUser.id : authUser.ownerAdminId;
  if (!ownerAdminId) throw new HttpError(403, "Usuario sin admin propietario");
  return all(
    `SELECT id, username, email, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt
     FROM usuarios
     WHERE ownerAdminId = ?
     ORDER BY datetime(createdAt) DESC`
    ,
    [ownerAdminId]
  );
}

/** SECRETARIA: crea usuario por username pudiendo elegir rol */
export async function createPlanillaUserBySecretaria({
  actorUser,
  username,
  password,
  rol,
  planillaAccessUntil,
  empleadoId,
  ownerAdminId,
}) {
  const actorOwnerAdminId = actorUser.rol === "ADMIN" ? actorUser.id : actorUser.ownerAdminId;
  if (!actorOwnerAdminId) throw new HttpError(403, "Usuario sin admin propietario");
  if (!username || !password || password.length < 6) {
    throw new HttpError(400, "Username y contraseña válidos requeridos (mín. 6 caracteres)");
  }
  const allowed = actorUser?.rol === "RRHH" ? ["EMPLEADO"] : ["ADMIN", "RRHH", "SECRETARIA"];
  if (!allowed.includes(rol)) {
    throw new HttpError(400, "Rol inválido");
  }
  const u = username.trim().toLowerCase();
  const existing = await get(`SELECT id FROM usuarios WHERE username = ?`, [u]);
  if (existing) throw new HttpError(409, "El usuario ya existe");

  let untilIso = null;
  let empleadoIdValue = null;
  let targetOwnerAdminId = actorOwnerAdminId;

  if (rol === "RRHH" && actorUser.rol === "SECRETARIA" && ownerAdminId) {
    const admin = await get(`SELECT id FROM usuarios WHERE id = ? AND rol = 'ADMIN'`, [ownerAdminId]);
    if (!admin) {
      throw new HttpError(404, "Admin no encontrado");
    }
    targetOwnerAdminId = ownerAdminId;
  }

  if (rol === "EMPLEADO") {
    if (!empleadoId) {
      throw new HttpError(400, "Debes vincular un empleado para este rol");
    }
    const emp = await get(`SELECT id FROM empleados WHERE id = ? AND ownerAdminId = ?`, [empleadoId, actorOwnerAdminId]);
    if (!emp) {
      throw new HttpError(404, "Empleado no encontrado");
    }
    const taken = await get(`SELECT id FROM usuarios WHERE empleadoId = ?`, [empleadoId]);
    if (taken) {
      throw new HttpError(409, "El empleado ya tiene un usuario vinculado");
    }
    empleadoIdValue = empleadoId;

    const until = planillaAccessUntil ? new Date(planillaAccessUntil) : null;
    if (!until || Number.isNaN(until.getTime())) {
      throw new HttpError(400, "planillaAccessUntil inválido (ISO datetime requerido)");
    }
    if (until <= new Date()) {
      throw new HttpError(400, "La fecha de vencimiento debe ser futura");
    }
    untilIso = until.toISOString();
  }

  const id = randomUUID();
  const hash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();
  await run(
    `INSERT INTO usuarios (id, username, email, password, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    [id, u, hash, rol, empleadoIdValue, untilIso, targetOwnerAdminId, createdAt]
  );
  return get(
    `SELECT id, username, email, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt FROM usuarios WHERE id = ?`,
    [id]
  );
}

export async function listPlanillaUsers(authUser) {
  if (authUser.rol === "SECRETARIA") {
    return all(
      `SELECT id, username, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt
       FROM usuarios
       WHERE username IS NOT NULL
       ORDER BY datetime(createdAt) DESC`
    );
  }
  const ownerAdminId = authUser.rol === "ADMIN" ? authUser.id : authUser.ownerAdminId;
  if (!ownerAdminId) throw new HttpError(403, "Usuario sin admin propietario");
  return all(
    `SELECT id, username, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt
     FROM usuarios
     WHERE username IS NOT NULL AND ownerAdminId = ?
     ORDER BY datetime(createdAt) DESC`,
    [ownerAdminId]
  );
}

export async function updatePlanillaUserBySecretaria(
  actorUser,
  id,
  { password, rol, planillaAccessUntil, empleadoId, ownerAdminId }
) {
  const actorOwnerAdminId = actorUser.rol === "ADMIN" ? actorUser.id : actorUser.ownerAdminId;
  if (!actorOwnerAdminId && actorUser.rol !== "SECRETARIA") throw new HttpError(403, "Usuario sin admin propietario");
  const user = actorUser.rol === "SECRETARIA"
    ? await get(`SELECT id, username FROM usuarios WHERE id = ? AND username IS NOT NULL`, [id])
    : await get(`SELECT id, username FROM usuarios WHERE id = ? AND username IS NOT NULL AND ownerAdminId = ?`, [
        id,
        actorOwnerAdminId,
      ]);
  if (!user) throw new HttpError(404, "Usuario no encontrado");

  const allowed = actorUser?.rol === "RRHH" ? ["EMPLEADO"] : ["ADMIN", "RRHH", "SECRETARIA"];
  if (!allowed.includes(rol)) {
    throw new HttpError(400, "Rol inválido");
  }

  let untilIso = null;
  let empleadoIdValue = null;
  let targetOwnerAdminId = actorOwnerAdminId;

  if (rol === "RRHH" && actorUser.rol === "SECRETARIA" && ownerAdminId) {
    const admin = await get(`SELECT id FROM usuarios WHERE id = ? AND rol = 'ADMIN'`, [ownerAdminId]);
    if (!admin) {
      throw new HttpError(404, "Admin no encontrado");
    }
    targetOwnerAdminId = ownerAdminId;
  }

  if (rol === "EMPLEADO") {
    if (!empleadoId) {
      throw new HttpError(400, "Debes vincular un empleado para este rol");
    }
    const emp = await get(`SELECT id FROM empleados WHERE id = ? AND ownerAdminId = ?`, [empleadoId, actorOwnerAdminId]);
    if (!emp) {
      throw new HttpError(404, "Empleado no encontrado");
    }
    const taken = await get(`SELECT id FROM usuarios WHERE empleadoId = ? AND id != ?`, [empleadoId, id]);
    if (taken) {
      throw new HttpError(409, "El empleado ya tiene un usuario vinculado");
    }
    empleadoIdValue = empleadoId;

    const until = planillaAccessUntil ? new Date(planillaAccessUntil) : null;
    if (!until || Number.isNaN(until.getTime())) {
      throw new HttpError(400, "planillaAccessUntil inválido (ISO datetime requerido)");
    }
    if (until <= new Date()) {
      throw new HttpError(400, "La fecha de vencimiento debe ser futura");
    }
    untilIso = until.toISOString();
  }

  if (password) {
    if (password.length < 6) {
      throw new HttpError(400, "La contraseña debe tener al menos 6 caracteres");
    }
    const hash = await bcrypt.hash(password, 10);
    await run(
      `UPDATE usuarios SET password = ?, rol = ?, empleadoId = ?, planillaAccessUntil = ?, ownerAdminId = ? WHERE id = ?`,
      [
      hash,
      rol,
      empleadoIdValue,
      untilIso,
      targetOwnerAdminId,
      id,
      ]
    );
  } else {
    await run(
      `UPDATE usuarios SET rol = ?, empleadoId = ?, planillaAccessUntil = ?, ownerAdminId = ? WHERE id = ?`,
      [rol, empleadoIdValue, untilIso, targetOwnerAdminId, id]
    );
  }

  return get(
    `SELECT id, username, email, rol, empleadoId, planillaAccessUntil, ownerAdminId, createdAt FROM usuarios WHERE id = ?`,
    [id]
  );
}

export async function deletePlanillaUserBySecretaria(authUser, id) {
  const ownerAdminId = authUser.rol === "ADMIN" ? authUser.id : authUser.ownerAdminId;
  if (!ownerAdminId && authUser.rol !== "SECRETARIA") throw new HttpError(403, "Usuario sin admin propietario");
  const user = authUser.rol === "SECRETARIA"
    ? await get(`SELECT id FROM usuarios WHERE id = ? AND username IS NOT NULL`, [id])
    : await get(`SELECT id FROM usuarios WHERE id = ? AND username IS NOT NULL AND ownerAdminId = ?`, [
        id,
        ownerAdminId,
      ]);
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  await run(`DELETE FROM usuarios WHERE id = ?`, [id]);
  return { ok: true };
}
