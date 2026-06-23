// src/App.jsx
/**
 * Enrutador principal de la aplicación.
 *
 * Árbol de rutas:
 *  /                    → LandingPage       (pública)
 *  /login               → LoginPage         (pública)
 *  /dashboard           → DashboardPage     (empleada autenticada)
 *  /dashboard/curso/:id → CoursePage        (empleada autenticada)
 *  /admin               → AdminDashboard    (solo admin)
 *  /admin/usuarios      → ManageUsers       (solo admin)
 *  /admin/cursos        → ManageCourses     (solo admin)
 *  /admin/panel         → DashboardERP      (solo admin)
 *  /admin/clientes      → ClientesPage      (solo admin)
 *  /admin/productos     → ProductosPage     (solo admin)
 *  /admin/rendimientos  → RendimientosPage  (solo admin)
 *  /admin/exportar      → ExportarPage      (solo admin)
 */

import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { useAuthStore } from "./store/authStore";
import { getMe, logoutUser } from "./api/authService";
import Spinner from "./components/ui/Spinner";

// ── Lazy imports (code-splitting automático con Vite) ──────────────────────
const LandingPage      = lazy(() => import("./pages/public/LandingPage"));
const LoginPage        = lazy(() => import("./pages/public/LoginPage"));
const DashboardPage    = lazy(() => import("./pages/employee/DashboardPage"));
const CoursePage       = lazy(() => import("./pages/employee/CoursePage"));
const AdminDashboard   = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageUsers      = lazy(() => import("./pages/admin/ManageUsers"));
const ManageCourses    = lazy(() => import("./pages/admin/ManageCourses"));

const DashboardLayout  = lazy(() => import("./components/layout/DashboardLayout"));
const AdminLayout      = lazy(() => import("./components/layout/AdminLayout"));

// imports para el dashboard ERP (solo admin)
const DashboardERP     = lazy(() => import("./pages/admin/dashboard_app/components/Dashboard"));
const ClientesPage     = lazy(() => import("./pages/admin/dashboard_app/components/ClientesPage"));
const ProductosPage    = lazy(() => import("./pages/admin/dashboard_app/components/ProductosPage"));
const RendimientosPage = lazy(() => import("./pages/admin/dashboard_app/components/RendimientosPage"));
const ExportarPage     = lazy(() => import("./pages/admin/dashboard_app/components/Exportar"));

// ── Spinner compartido ─────────────────────────────────────────────────────
const FullPageSpinner = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-950">
    <Spinner size="lg" />
  </div>
);

// ── Verificación de sesión al iniciar la app ───────────────────────────────
/**
 * Al abrir la app, si localStorage dice que el usuario estaba autenticado,
 * verificamos contra el backend llamando a /auth/me.
 *
 * Flujo:
 *  1. token en memoria es null (no persiste entre recargas)
 *  2. getMe() dispara un 401
 *  3. El interceptor de axiosClient intenta refresh vía httpOnly cookie
 *  4a. Si la cookie es válida → nuevo access token → getMe() se reintenta → OK
 *  4b. Si la cookie expiró o fue invalidada → refresh falla → logout local
 *
 * Esto garantiza que isAuthenticated en localStorage no pueda "mentir":
 * siempre se valida contra el estado real del servidor antes de renderizar.
 */
function useAuthInit() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const { isAuthenticated, updateUser } = useAuthStore.getState();

    // Si nunca hubo sesión, no hay nada que verificar
    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    getMe()
      .then((userData) => updateUser(userData))
      .catch(() => {
        // El refresh también falló (cookie expirada/inválida).
        // Limpiamos el estado local; el usuario verá /login.
        logoutUser();
      })
      .finally(() => setIsChecking(false));
  }, []);

  return isChecking;
}

// ── Guards ─────────────────────────────────────────────────────────────────

/**
 * ProtectedRoute: permite el acceso solo si el usuario está autenticado.
 * isAuthenticated se considera confiable aquí porque useAuthInit ya lo validó
 * contra el backend al iniciar la app.
 */
function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * AdminRoute: permite el acceso solo a usuarios con rol "admin".
 * El rol viene de /auth/me (fuente de verdad), no del login response.
 */
function AdminRoute() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated)       return <Navigate to="/login"     replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/**
 * GuestRoute: impide que usuarios ya autenticados vean /login.
 * Los redirige a su sección correspondiente según su rol.
 */
function GuestRoute() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Outlet />;
  return <Navigate to={user?.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

// ── Componente raíz ────────────────────────────────────────────────────────
export default function App() {
  const isChecking = useAuthInit();

  /**
   * Bloqueamos el render de las rutas hasta que la verificación
   * de sesión termine. Evita que guards basados en isAuthenticated
   * tomen decisiones con datos desactualizados.
   */
  if (isChecking) return <FullPageSpinner />;

  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          {/* ── Rutas públicas ───────────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ── Área de empleada (autenticada) ───────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard"                  element={<DashboardPage />} />
              <Route path="/dashboard/curso/:courseId"  element={<CoursePage />} />
            </Route>
          </Route>

          {/* ── Panel de administración (solo admin) ─────────────────── */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin"               element={<AdminDashboard />} />
              <Route path="/admin/usuarios"      element={<ManageUsers />} />
              <Route path="/admin/cursos"        element={<ManageCourses />} />
              {/* Dashboard ERP */}
              <Route path="/admin/panel"         element={<DashboardERP />} />
              <Route path="/admin/clientes"      element={<ClientesPage />} />
              <Route path="/admin/productos"     element={<ProductosPage />} />
              <Route path="/admin/rendimientos"  element={<RendimientosPage />} />
              <Route path="/admin/exportar"      element={<ExportarPage />} />
            </Route>
          </Route>

          {/* ── 404 fallback ─────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}