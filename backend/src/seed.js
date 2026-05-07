import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { initDb, run, get, getDb } from "./db/index.js";

export async function autoSeed() {
  let existing;
  try {
    existing = await get(`SELECT COUNT(*) as c FROM usuarios`);
  } catch {
    existing = { c: 0 };
  }
  if (existing.c > 0) {
    console.log("BD ya tiene datos. Seed automático omitido.");
    return;
  }

  let hasPartial = false;
  try {
    const a = await get(`SELECT COUNT(*) as c FROM areas`);
    hasPartial = a.c > 0;
  } catch {
    hasPartial = false;
  }

  if (hasPartial) {
    console.log("BD con datos parciales. Limpiando tablas...");
    const db = getDb();
    db.pragma("foreign_keys = OFF");
    for (const t of ["asistencias", "notificaciones", "planillas", "usuarios", "empleados", "cargos", "areas"]) {
      db.exec(`DELETE FROM ${t}`);
    }
    db.pragma("foreign_keys = ON");
  }

  const now = new Date().toISOString();

  const areaAdmin = randomUUID();
  const areaTi = randomUUID();
  const cargoGer = randomUUID();
  const cargoDev = randomUUID();

  const emp1 = randomUUID();
  const emp2 = randomUUID();

  const userAdmin = randomUUID();
  const userRrhh = randomUUID();
  const userEmp = randomUUID();
  const userSec = randomUUID();

  await run(`INSERT INTO areas (id, nombre, createdAt) VALUES (?, ?, ?)`, [areaAdmin, "Administración", now]);
  await run(`INSERT INTO areas (id, nombre, createdAt) VALUES (?, ?, ?)`, [areaTi, "Tecnología", now]);
  await run(`INSERT INTO cargos (id, nombre, areaId, createdAt) VALUES (?, ?, ?, ?)`, [cargoGer, "Gerente RRHH", areaAdmin, now]);
  await run(`INSERT INTO cargos (id, nombre, areaId, createdAt) VALUES (?, ?, ?, ?)`, [cargoDev, "Desarrollador", areaTi, now]);

  await run(
    `INSERT INTO empleados (id, nombres, apellidos, dni, correo, telefono, direccion, cargoId, areaId, salario, fechaIngreso, estado, fotoPath, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', NULL, ?, ?)`,
    [emp1, "María", "López", "12345678", "maria.lopez@empresa.demo", "999111222", "Av. Principal 123", cargoGer, areaAdmin, 8500, "2023-01-15", now, now]
  );
  await run(
    `INSERT INTO empleados (id, nombres, apellidos, dni, correo, telefono, direccion, cargoId, areaId, salario, fechaIngreso, estado, fotoPath, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', NULL, ?, ?)`,
    [emp2, "Carlos", "Vargas", "87654321", "carlos.vargas@empresa.demo", "999333444", "Jr. Los Olivos 45", cargoDev, areaTi, 6200, "2024-06-01", now, now]
  );

  const hash = (p) => bcrypt.hashSync(p, 10);

  await run(`INSERT INTO usuarios (id, username, email, password, rol, empleadoId, planillaAccessUntil, createdAt) VALUES (?, NULL, ?, ?, 'ADMIN', NULL, NULL, ?)`, [userAdmin, "admin@empresa.demo", hash("Admin123!"), now]);
  await run(`INSERT INTO usuarios (id, username, email, password, rol, empleadoId, planillaAccessUntil, createdAt) VALUES (?, NULL, ?, ?, 'RRHH', NULL, NULL, ?)`, [userRrhh, "rrhh@empresa.demo", hash("Rrhh123!"), now]);
  await run(`INSERT INTO usuarios (id, username, email, password, rol, empleadoId, planillaAccessUntil, createdAt) VALUES (?, NULL, ?, ?, 'EMPLEADO', ?, NULL, ?)`, [userEmp, "empleado@empresa.demo", hash("Emp123!"), emp2, now]);
  await run(`INSERT INTO usuarios (id, username, email, password, rol, empleadoId, planillaAccessUntil, createdAt) VALUES (?, NULL, ?, ?, 'SECRETARIA', NULL, NULL, ?)`, [userSec, "secretaria@empresa.demo", hash("Sec123!"), now]);

  const asId = randomUUID();
  const hoy = now.slice(0, 10);
  await run(`INSERT INTO asistencias (id, empleadoId, fecha, entradaAt, salidaAt, minutosTardanza, estado, notas, createdAt) VALUES (?, ?, ?, ?, NULL, 0, 'PUNTUAL', NULL, ?)`, [asId, emp1, hoy, now, now]);

  console.log("Seed completado.");
  console.log("ADMIN   admin@empresa.demo   / Admin123!");
  console.log("RRHH    rrhh@empresa.demo    / Rrhh123!");
  console.log("EMPLEADO empleado@empresa.demo / Emp123!");
  console.log("SECRETARIA secretaria@empresa.demo / Sec123!");
}

async function main() {
  await initDb();
  await autoSeed();
  process.exit(0);
}

main();
