import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layouts/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { CustomersPage } from './pages/CustomersPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { PosPage } from './pages/PosPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductFormPage } from './pages/ProductFormPage'
import { ProductsPage } from './pages/ProductsPage'
import { LowStockPage } from './pages/products/LowStockPage'
import { ProductOptionsPage } from './pages/products/ProductOptionsPage'
import { ProductBrandsPage } from './pages/products/ProductBrandsPage'
import { ProductCategoriesPage } from './pages/products/ProductCategoriesPage'
import { ProductUnitsPage } from './pages/products/ProductUnitsPage'
import { StockMovementPage } from './pages/products/StockMovementPage'
import { PurchaseOrderDetailPage } from './pages/purchases/PurchaseOrderDetailPage'
import { PurchaseOrdersPage } from './pages/purchases/PurchaseOrdersPage'
import { ReceiveGoodsPage } from './pages/purchases/ReceiveGoodsPage'
import { SupplierReturnsPage } from './pages/purchases/SupplierReturnsPage'
import { SuppliersPage } from './pages/purchases/SuppliersPage'
import { StoresPage } from './pages/StoresPage'
import { AppLoader } from './components/AppLoader'
import { RequireAuth } from './components/auth/RequireAuth'
import { RequirePermission } from './components/auth/RequirePermission'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { Toaster } from './components/Toaster'
import { useAppLoading } from './hooks/useAppLoading'
import { BusinessProfilePage } from './pages/BusinessProfilePage'
import { SignInPage } from './pages/auth/SignInPage'
import { BusinessRegistrationPage } from './pages/auth/BusinessRegistrationPage'
import { UsersPage } from './pages/UsersPage'
import { RoleManagementPage } from './pages/RoleManagementPage'
import { TasksPage } from './pages/TasksPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const { isLoading, isStarting } = useAppLoading()
  const [preloaderEnabled, setPreloaderEnabled] = useState(() => typeof document === 'undefined' || document.documentElement.dataset.preloader !== 'disabled')

  useEffect(() => {
    const sync = () => setPreloaderEnabled(document.documentElement.dataset.preloader !== 'disabled')
    window.addEventListener('app-theme-config-changed', sync)
    return () => window.removeEventListener('app-theme-config-changed', sync)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppLoader isLoading={preloaderEnabled && isLoading} isStarting={isStarting} />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="sign-in" element={<SignInPage />} />
            <Route path="register-business" element={<BusinessRegistrationPage />} />
            <Route element={<RequireAuth />}>
              {/* Admin shell — POS uses same sidebar + top bar + brand colors */}
              <Route element={<AdminLayout />}>
                <Route element={<RequirePermission permission="x-bff:read" />}>
                  <Route index element={<DashboardPage />} />
                </Route>
                <Route element={<RequirePermission permission="x-order:create" />}>
                  <Route path="pos" element={<PosPage />} />
                </Route>
                <Route element={<RequirePermission permission="x-product:read" />}>
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="products/options" element={<ProductOptionsPage />} />
                  <Route path="products/variants" element={<Navigate to="/products/options" replace />} />
                  <Route path="products/stock-movement" element={<StockMovementPage />} />
                  <Route path="products/low-stock" element={<LowStockPage />} />
                  <Route path="products/new" element={<ProductFormPage />} />
                  <Route path="products/:id" element={<ProductDetailPage />} />
                  <Route path="products/:sku/edit" element={<ProductFormPage />} />
                  <Route path="inventory" element={<Navigate to="/products/low-stock" replace />} />
                </Route>
                <Route element={<RequirePermission permission="x-product:unit" />}>
                  <Route
                    path="products/units"
                    element={<ProductUnitsPage />}
                  />
                </Route>
                <Route element={<RequirePermission permission="x-product:category" />}>
                  <Route
                    path="products/categories"
                    element={<ProductCategoriesPage />}
                  />
                </Route>
                <Route element={<RequirePermission permission="x-product:brand" />}>
                  <Route
                    path="products/brands"
                    element={<ProductBrandsPage />}
                  />
                </Route>
                <Route path="products/options" element={<ProductOptionsPage />} />
                <Route path="products/variants" element={<Navigate to="/products/options" replace />} />
                <Route path="products/stock-movement" element={<StockMovementPage />} />
                <Route path="products/low-stock" element={<LowStockPage />} />
                <Route path="products/new" element={<ProductFormPage />} />
                <Route path="products/:id" element={<ProductDetailPage />} />
                <Route path="products/:sku/edit" element={<ProductFormPage />} />
                <Route path="inventory" element={<Navigate to="/products/low-stock" replace />} />
                <Route path="stores" element={<StoresPage />} />
                <Route
                  path="sales"
                  element={<PlaceholderPage title="Sales" description="Sales history and invoices." />}
                />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="purchases" element={<PurchaseOrdersPage />} />
                <Route path="purchases/orders/new" element={<PurchaseOrderDetailPage />} />
                <Route path="purchases/orders/:id" element={<PurchaseOrderDetailPage />} />
                <Route path="purchases/receive" element={<ReceiveGoodsPage />} />
                <Route path="purchases/suppliers" element={<SuppliersPage />} />
                <Route path="purchases/returns" element={<SupplierReturnsPage />} />
                <Route element={<RequirePermission permission="x-customer:read" />}>
                  <Route path="customers" element={<CustomersPage />} />
                </Route>
                <Route
                  path="reports"
                  element={<PlaceholderPage title="Reports" description="Business reports." />}
                />
                <Route path="settings" element={<BusinessProfilePage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="roles" element={<RoleManagementPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </ToastProvider>
  </QueryClientProvider>
  )
}
