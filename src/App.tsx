import React, { lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useAuth } from "@/contexts/AuthContext";
import debugLogger from "@/utils/debugLogger";

// Suppress harmless ResizeObserver warnings
import "./utils/suppressResizeObserverError";
// Loading state manager to prevent white screens (Removed due to missing file)


import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkErrorBoundary from "./components/NetworkErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import AuthErrorHandler from "./components/AuthErrorHandler";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";


// Main Pages
import Index from "./pages/Index";
// BookListing removed — replaced by Textbooks page
import BookDetails from "./pages/BookDetails";
import Textbooks from "./pages/Items";
import EditBook from "./pages/EditBook";
import EditUniform from "./pages/EditUniform";
import EditSupply from "./pages/EditSupply";
import Profile from "./pages/Profile";
import CreateListing from "./pages/CreateListing";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutPending from "./pages/CheckoutPending";
import CheckoutCancel from "./pages/CheckoutCancel";
import Chats from "./pages/Chats";



// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Verify from "./pages/Verify";
import AuthCallback from "./pages/AuthCallback";
// EnvironmentConfigHelper no longer needed — credentials have reliable fallbacks


// Support Pages
import ContactUs from "./pages/ContactUs";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Policies from "./pages/Policies";
import Shipping from "./pages/Shipping";
import Tracking from "./pages/Tracking";
import Report from "./pages/Report";
import SellerProfile from "./pages/SellerProfile";
import GettingStarted from "./pages/GettingStarted";


// Other Pages
import NotificationsNew from "./pages/NotificationsNew";
import ClearNotifications from "./pages/ClearNotifications";
import RestoreBooks from "./pages/RestoreBooks";
import BankingSetup from "./pages/BankingSetup";
import UserProfile from "./pages/UserProfile";
import WebhookTest from "./pages/WebhookTest";
import { GoogleMapsProvider } from "./contexts/GoogleMapsContext";
// import LockerSearchPage from "./pages/LockerSearchPage"; // DISABLED - Locker functionality removed


import "./App.css";

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Wrapper component to use hooks inside Router context
function AppRoutes() {
  const { user } = useAuth();

  debugLogger.info("AppRoutes", "Routes component mounted", { userId: user?.id });

  // Track page views
  usePageTracking(user?.id);

  return (
    <>
      <AuthErrorHandler />
      <ScrollToTop />


      <Routes>
        {/* Main Application Routes */}
        <Route path="/" element={<Index />} />
        {/* Main browse page — SEO-friendly segments */}
        <Route path="/listings" element={<Textbooks />} />
        <Route path="/listings/*" element={<Textbooks />} />
        {/* Main browse page — legacy /textbooks is redirected to /listings */}
        <Route path="/textbooks" element={<Textbooks />} />
        <Route path="/textbooks/*" element={<Textbooks />} />
        {/* Individual book detail — SEO-friendly slug routes */}
        <Route path="/textbook/:id" element={<BookDetails />} />
        <Route path="/school-uniform/:id" element={<BookDetails />} />
        <Route path="/supplies/:id" element={<BookDetails />} />
        {/* Legacy detail routes */}
        <Route path="/textbooks/book/:id" element={<BookDetails />} />
        {/* Legacy redirects */}
        <Route path="/books" element={<Textbooks />} />
        <Route path="/books/:id" element={<BookDetails />} />
        <Route path="/book/:id" element={<BookDetails />} />
        <Route
          path="/edit-book/:id"
          element={
            <ProtectedRoute>
              <EditBook />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-uniform/:id"
          element={
            <ProtectedRoute>
              <EditUniform />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-supply/:id"
          element={
            <ProtectedRoute>
              <EditSupply />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/:sellerId"
          element={<SellerProfile />}
        />

        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route path="/verify" element={<Verify />} />
        <Route path="/verify/*" element={<VerifyEmail />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected User Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-listing"
          element={
            <ProtectedRoute>
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/:id"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout-cart"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/success"
          element={<CheckoutSuccess />}
        />
        <Route
          path="/checkout/pending"
          element={<CheckoutPending />}
        />
        <Route
          path="/checkout/cancel"
          element={<CheckoutCancel />}
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clear-notifications"
          element={
            <ProtectedRoute>
              <ClearNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/restore-books"
          element={
            <ProtectedRoute>
              <RestoreBooks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/banking-setup"
          element={
            <ProtectedRoute>
              <BankingSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chats"
          element={
            <ProtectedRoute>
              <Chats />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sell"
          element={
            <ProtectedRoute>
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        {/* DISABLED - Locker functionality removed */}
        {/* <Route
          path="/lockers"
          element={<LockerSearchPage />}
        /> */}

        {/* Support Routes */}
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/shipping" element={<Shipping />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/getting-started" element={<GettingStarted />} />

        <Route path="/report" element={<Report />} />
        <Route path="/webhook-test" element={<WebhookTest />} />

        {/* 404 Catch All */}
        <Route path="*" element={<Index />} />
      </Routes>
    </>
  );
}

function App() {
  debugLogger.info("App", "App component initializing");
  debugLogger.info("App", "Rendering app with all providers");

  return (
    <ErrorBoundary level="app">
      <NetworkErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GoogleMapsProvider>
            <ThemeProvider attribute="class" defaultTheme="light">
              <AuthProvider>
                <CartProvider>
                  <Router>
                    <AppRoutes />
                  </Router>
                </CartProvider>
              </AuthProvider>
            </ThemeProvider>
          </GoogleMapsProvider>
        </QueryClientProvider>
        <Analytics />
        <SpeedInsights />
      </NetworkErrorBoundary>
    </ErrorBoundary>
  );
}
export default App;
