// src/App.jsx
/**
 * Enrutador principal de la aplicación.
 *
 * Árbol de rutas:
 *  /                    → LandingPage       (pública)
 *  /login               → LoginPage         (pública)
 *  /activate            → ActivatePage      (pública — activación por correo)
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

// ── Lazy imports ───────────────────────────────────────────────────────────
const LandingPage      = lazy(() => import("./pages/public/LandingPage"));
const LoginPage        = lazy(() => import("./pages/public/LoginPage"));
const ActivatePage     = lazy(() => import("./pages/public/ActivatePage"));
const DashboardPage    = lazy(() => import("./pages/employee/DashboardPage"));
const CoursePage       = lazy(() => import("./pages/employee/CoursePage"));
const AdminDashboard   = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageUsers      = lazy(() => import("./pages/admin/ManageUsers"));
const ManageCourses    = lazy(() => import("./pages/admin/ManageCourses"));

const DashboardLayout  = lazy(() => import("./components/layout/DashboardLayout"));
const AdminLayout      = lazy(() => import("./components/layout/AdminLayout"));

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

// ── Verificación de sesión al iniciar ──────────────────────────────────────
function useAuthInit() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const { isAuthenticated, updateUser } = useAuthStore.getState();

    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    getMe()
      .then((userData) => updateUser(userData))
      .catch(() => { logoutUser(); })
      .finally(() => setIsChecking(false));
  }, []);

  return isChecking;
}

// ── Guards ─────────────────────────────────────────────────────────────────

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminRoute() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated)       return <Navigate to="/login"     replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function GuestRoute() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Outlet />;
  return <Navigate to={user?.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const isChecking = useAuthInit();

  if (isChecking) return <FullPageSpinner />;

  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          {/* ── Rutas públicas ───────────────────────────────────────── */}
          <Route path="/"         element={<LandingPage />} />
          <Route path="/activate" element={<ActivatePage />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ── Área de empleada ─────────────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard"                 element={<DashboardPage />} />
              <Route path="/dashboard/curso/:courseId" element={<CoursePage />} />
            </Route>
          </Route>

          {/* ── Panel de administración ───────────────────────────────── */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin"              element={<AdminDashboard />} />
              <Route path="/admin/usuarios"     element={<ManageUsers />} />
              <Route path="/admin/cursos"       element={<ManageCourses />} />
              <Route path="/admin/panel"        element={<DashboardERP />} />
              <Route path="/admin/clientes"     element={<ClientesPage />} />
              <Route path="/admin/productos"    element={<ProductosPage />} />
              <Route path="/admin/rendimientos" element={<RendimientosPage />} />
              <Route path="/admin/exportar"     element={<ExportarPage />} />
            </Route>
          </Route>

          {/* ── 404 ──────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}