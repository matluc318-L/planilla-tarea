import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import RoleRoute from "./routes/RoleRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Empleados from "./pages/Empleados.jsx";
import EmpleadoDetalle from "./pages/EmpleadoDetalle.jsx";
import Asistencia from "./pages/Asistencia.jsx";
import Planillas from "./pages/Planillas.jsx";
import Reportes from "./pages/Reportes.jsx";
import Notificaciones from "./pages/Notificaciones.jsx";
import UsuariosPlanilla from "./pages/UsuariosPlanilla.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="empleados" element={<Empleados />} />
        <Route path="empleados/:id" element={<EmpleadoDetalle />} />
        <Route path="asistencia" element={<Asistencia />} />
        <Route path="planillas" element={<Planillas />} />
        <Route
          path="reportes"
          element={
            <RoleRoute allow={["ADMIN", "RRHH"]}>
              <Reportes />
            </RoleRoute>
          }
        />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route
          path="secretaria/usuarios-planilla"
          element={
            <RoleRoute allow={["SECRETARIA"]}>
              <UsuariosPlanilla />
            </RoleRoute>
          }
        />
        <Route
          path="rrhh/usuarios-empleados"
          element={
            <RoleRoute allow={["RRHH"]}>
              <UsuariosPlanilla />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
