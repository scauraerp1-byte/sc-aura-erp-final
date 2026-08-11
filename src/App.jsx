import "@/App.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import ProductDetail from "@/pages/ProductDetail";
import ProductEdit from "@/pages/ProductEdit";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import CustomerEdit from "@/pages/CustomerEdit";
import Bookings from "@/pages/Bookings";
import BookingForm from "@/pages/BookingForm";
import BookingDetail from "@/pages/BookingDetail";
import Dispatch from "@/pages/Dispatch";
import DispatchForm from "@/pages/DispatchForm";
import DispatchDetail from "@/pages/DispatchDetail";
import { EstimatesList, EstimateForm } from "@/pages/Estimates";
import { VendorReturnsList, VendorReturnForm } from "@/pages/VendorReturns";
import Analytics from "@/pages/Analytics";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";
import Profile from "@/pages/Profile";
import PublicCatalogue from "@/pages/PublicCatalogue";
import PublicReceipt from "@/pages/PublicReceipt";

function Shell({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

/* =========================================================
   SC AURA SPLASH
   Shows ONLY once when the SPA initially loads.
========================================================= */

function LaunchSplash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setLeaving(true);
    }, 650);

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 1000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-[#111827] ${
        leaving ? "scaura-splash-leaving" : ""
      }`}
      style={{
        animation: "scauraSplashFadeIn 0.35s ease-out forwards",
      }}
    >
      <div
        className="flex flex-col items-center justify-center"
        style={{
          animation:
            "scauraLogoEnter 0.75s cubic-bezier(.2,.8,.2,1) forwards",
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            animation: "scauraLogoPulse 1.4s ease-in-out infinite",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: "190px",
              height: "190px",
              background:
                "radial-gradient(circle, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.06) 42%, transparent 72%)",
              filter: "blur(8px)",
            }}
          />

          <img
            src="https://app.scaurakurtis.com/icons/icon-512.png?v=2"
            alt="SC Aura Kurtis"
            className="relative w-36 h-36 sm:w-40 sm:h-40 object-contain"
            draggable="false"
          />
        </div>

        <div
          className="mt-5 text-center"
          style={{
            animation: "scauraTextEnter 0.7s 0.18s ease-out both",
          }}
        >
          <div className="text-[11px] uppercase tracking-[0.38em] text-white/55">
            Wholesale ERP
          </div>

          <div className="mt-1 text-sm tracking-[0.16em] text-white/90 font-medium">
            SC AURA KURTIS
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SPLASH ANIMATION
========================================================= */

function SplashStyles() {
  return (
    <style>{`
      @keyframes scauraSplashFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes scauraLogoEnter {
        0% {
          opacity: 0;
          transform: translateY(12px) scale(0.82);
          filter: blur(5px);
        }

        55% {
          opacity: 1;
          transform: translateY(0) scale(1.04);
          filter: blur(0);
        }

        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
      }

      @keyframes scauraLogoPulse {
        0%,
        100% {
          transform: scale(1);
        }

        50% {
          transform: scale(1.025);
        }
      }

      @keyframes scauraTextEnter {
        from {
          opacity: 0;
          transform: translateY(8px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes scauraSplashLeave {
        from {
          opacity: 1;
          transform: scale(1);
        }

        to {
          opacity: 0;
          transform: scale(1.015);
          pointer-events: none;
        }
      }

      .scaura-splash-leaving {
        animation: scauraSplashLeave 0.35s ease-in forwards !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .scaura-splash-leaving {
          animation: none !important;
        }
      }
    `}</style>
  );
}

/* =========================================================
   TOASTER
========================================================= */

function ThemedToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      theme={theme === "light" ? "light" : "dark"}
      position="top-center"
      richColors={false}
      toastOptions={{
        style:
          theme === "light"
            ? {
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                color: "#111827",
              }
            : {
                background: "#11151d",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#f3f4f6",
              },
      }}
    />
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <ThemeProvider>
          <BrandingProvider>
            <BrowserRouter>
              <SplashStyles />
              <LaunchSplash />
              <ThemedToaster />

              <Routes>
                {/* Login */}
                <Route path="/login" element={<Login />} />

                {/* Public routes */}
                <Route
                  path="/catalogue/:sr"
                  element={<PublicCatalogue />}
                />

                <Route
                  path="/r/booking/:id"
                  element={<PublicReceipt kind="booking" />}
                />

                <Route
                  path="/r/dispatch/:id"
                  element={<PublicReceipt kind="dispatch" />}
                />

                {/* Dashboard */}
                <Route
                  path="/"
                  element={
                    <Shell>
                      <Dashboard />
                    </Shell>
                  }
                />

                {/* Products */}
                <Route
                  path="/products"
                  element={
                    <Shell>
                      <Products />
                    </Shell>
                  }
                />

                <Route
                  path="/products/new"
                  element={
                    <Shell>
                      <ProductForm />
                    </Shell>
                  }
                />

                <Route
                  path="/products/:id"
                  element={
                    <Shell>
                      <ProductDetail />
                    </Shell>
                  }
                />

                <Route
                  path="/products/:id/edit"
                  element={
                    <ProtectedRoute roles={["admin", "manager"]}>
                      <Layout>
                        <ProductEdit />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Customers */}
                <Route
                  path="/customers"
                  element={
                    <Shell>
                      <Customers />
                    </Shell>
                  }
                />

                <Route
                  path="/customers/:id"
                  element={
                    <Shell>
                      <CustomerDetail />
                    </Shell>
                  }
                />

                <Route
                  path="/customers/:id/edit"
                  element={
                    <Shell>
                      <CustomerEdit />
                    </Shell>
                  }
                />

                {/* Bookings */}
                <Route
                  path="/bookings"
                  element={
                    <Shell>
                      <Bookings />
                    </Shell>
                  }
                />

                <Route
                  path="/bookings/new"
                  element={
                    <Shell>
                      <BookingForm />
                    </Shell>
                  }
                />

                <Route
                  path="/bookings/:id"
                  element={
                    <Shell>
                      <BookingDetail />
                    </Shell>
                  }
                />

                <Route
                  path="/bookings/:id/edit"
                  element={
                    <Shell>
                      <BookingForm editMode />
                    </Shell>
                  }
                />

                {/* Dispatch */}
                <Route
                  path="/dispatch"
                  element={
                    <Shell>
                      <Dispatch />
                    </Shell>
                  }
                />

                <Route
                  path="/dispatch/new"
                  element={
                    <Shell>
                      <DispatchForm />
                    </Shell>
                  }
                />

                <Route
                  path="/dispatch/:id"
                  element={
                    <Shell>
                      <DispatchDetail />
                    </Shell>
                  }
                />

                {/* Estimates */}
                <Route
                  path="/estimates"
                  element={
                    <Shell>
                      <EstimatesList />
                    </Shell>
                  }
                />

                <Route
                  path="/estimates/new"
                  element={
                    <Shell>
                      <EstimateForm />
                    </Shell>
                  }
                />

                <Route
                  path="/estimates/:id/edit"
                  element={
                    <Shell>
                      <EstimateForm editMode />
                    </Shell>
                  }
                />

                {/* Vendor Returns */}
                <Route
                  path="/vendor-returns"
                  element={
                    <ProtectedRoute roles={["admin", "super_staff"]}>
                      <Layout>
                        <VendorReturnsList />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/vendor-returns/new"
                  element={
                    <ProtectedRoute roles={["admin", "super_staff"]}>
                      <Layout>
                        <VendorReturnForm />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Analytics */}
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute roles={["admin", "manager"]}>
                      <Layout>
                        <Analytics />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* History */}
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute roles={["admin", "manager"]}>
                      <Layout>
                        <History />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Users */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <Layout>
                        <Users />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Profile */}
                <Route
                  path="/profile"
                  element={
                    <Shell>
                      <Profile />
                    </Shell>
                  }
                />

                {/* Settings */}
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </BrowserRouter>
          </BrandingProvider>
        </ThemeProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
