// src/App.jsx
/**
 * Enrutador principal de la aplicación.
 *
 * Árbol de rutas:
 *  /                  → LandingPage       (pública)
 *  /login             → LoginPage         (pública)
 *  /dashboard         → DashboardPage     (empleada autenticada)
 *  /dashboard/curso/:id → CoursePage      (empleada autenticada)
 *  /admin             → AdminDashboard    (solo admin)
 *  /admin/usuarios    → ManageUsers       (solo admin)
 *  /admin/cursos      → ManageCourses     (solo admin)
 */

import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { useAuthStore } from "./store/authStore";
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


// ── Guards ─────────────────────────────────────────────────────────────────

/**
 * ProtectedRoute: permite el acceso solo si el usuario está autenticado.
 * Redirige a /login si no hay sesión activa.
 */
function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * AdminRoute: permite el acceso solo a usuarios con rol "admin".
 * Redirige al dashboard de empleada si el rol no coincide.
 */
function AdminRoute() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/**
 * GuestRoute: impide que usuarios ya autenticados vean /login.
 * Los redirige a su sección correspondiente.
 */
function GuestRoute() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Outlet />;
  return <Navigate to={user?.role === "admin" ? "/admin" : "/dashboard"} replace />;
}


// ── Componente raíz ────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      {/* Suspense global: muestra spinner mientras cargan los chunks lazy */}
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center bg-gray-950">
            <Spinner size="lg" />
          </div>
        }
      >
        <Routes>
          {/* ── Rutas públicas ───────────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ── Área de empleada (autenticada) ───────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/curso/:courseId" element={<CoursePage />} />
            </Route>
          </Route>

          {/* ── Panel de administración (solo admin) ─────────────────── */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin"            element={<AdminDashboard />} />
              <Route path="/admin/usuarios"   element={<ManageUsers />} />
              <Route path="/admin/cursos"     element={<ManageCourses />} />
            </Route>
          </Route>

          {/* ── 404 fallback ─────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}