import "@/App.css";
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

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme === "light" ? "light" : "dark"}
      position="top-center"
      richColors={false}
      toastOptions={{
        style: theme === "light"
          ? { background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827" }
          : { background: "#11151d", border: "1px solid rgba(255,255,255,0.10)", color: "#f3f4f6" },
      }}
    />
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <ThemeProvider>
          <BrandingProvider>
            <BrowserRouter>
              <ThemedToaster />
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Public routes */}
                <Route path="/catalogue/:sr" element={<PublicCatalogue />} />
                <Route path="/r/booking/:id" element={<PublicReceipt kind="booking" />} />
                <Route path="/r/dispatch/:id" element={<PublicReceipt kind="dispatch" />} />

                <Route path="/" element={<Shell><Dashboard /></Shell>} />

                {/* Products */}
                <Route path="/products" element={<Shell><Products /></Shell>} />
                <Route path="/products/new" element={<Shell><ProductForm /></Shell>} />
                <Route path="/products/:id" element={<Shell><ProductDetail /></Shell>} />
                <Route path="/products/:id/edit" element={
                  <ProtectedRoute roles={["admin", "manager"]}><Layout><ProductEdit /></Layout></ProtectedRoute>
                } />

                {/* Customers */}
                <Route path="/customers" element={<Shell><Customers /></Shell>} />
                <Route path="/customers/:id" element={<Shell><CustomerDetail /></Shell>} />
                <Route path="/customers/:id/edit" element={<Shell><CustomerEdit /></Shell>} />

                {/* Bookings */}
                <Route path="/bookings" element={<Shell><Bookings /></Shell>} />
                <Route path="/bookings/new" element={<Shell><BookingForm /></Shell>} />
                <Route path="/bookings/:id" element={<Shell><BookingDetail /></Shell>} />
                <Route path="/bookings/:id/edit" element={<Shell><BookingForm editMode /></Shell>} />

                {/* Dispatch */}
                <Route path="/dispatch" element={<Shell><Dispatch /></Shell>} />
                <Route path="/dispatch/new" element={<Shell><DispatchForm /></Shell>} />

                {/* Estimates */}
                <Route path="/estimates" element={<Shell><EstimatesList /></Shell>} />
                <Route path="/estimates/new" element={<Shell><EstimateForm /></Shell>} />
                <Route path="/estimates/:id/edit" element={<Shell><EstimateForm editMode /></Shell>} />

                {/* Vendor Returns */}
                <Route path="/vendor-returns" element={
                  <ProtectedRoute roles={["admin", "super_staff"]}><Layout><VendorReturnsList /></Layout></ProtectedRoute>
                } />
                <Route path="/vendor-returns/new" element={
                  <ProtectedRoute roles={["admin", "super_staff"]}><Layout><VendorReturnForm /></Layout></ProtectedRoute>
                } />

                {/* Analytics */}
                <Route path="/analytics" element={
                  <ProtectedRoute roles={["admin", "manager"]}><Layout><Analytics /></Layout></ProtectedRoute>
                } />
                <Route path="/history" element={
                  <ProtectedRoute roles={["admin", "manager"]}><Layout><History /></Layout></ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute roles={["admin"]}><Layout><Users /></Layout></ProtectedRoute>
                } />
                <Route path="/profile" element={<Shell><Profile /></Shell>} />
                <Route path="/settings" element={
                  <ProtectedRoute roles={["admin"]}><Layout><Settings /></Layout></ProtectedRoute>
                } />
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
