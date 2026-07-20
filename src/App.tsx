import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layouts/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { PosPage } from './pages/PosPage'
import { ProductFormPage } from './pages/ProductFormPage'
import { ProductsPage } from './pages/ProductsPage'
import { LowStockPage } from './pages/products/LowStockPage'
import { ProductVariantsPage } from './pages/products/ProductVariantsPage'
import { StockMovementPage } from './pages/products/StockMovementPage'
import { PurchaseOrderDetailPage } from './pages/purchases/PurchaseOrderDetailPage'
import { PurchaseOrdersPage } from './pages/purchases/PurchaseOrdersPage'
import { ReceiveGoodsPage } from './pages/purchases/ReceiveGoodsPage'
import { SupplierReturnsPage } from './pages/purchases/SupplierReturnsPage'
import { SuppliersPage } from './pages/purchases/SuppliersPage'
import { StoresPage } from './pages/StoresPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin shell — POS uses same sidebar + top bar + brand colors */}
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/variants" element={<ProductVariantsPage />} />
          <Route path="products/stock-movement" element={<StockMovementPage />} />
          <Route path="products/low-stock" element={<LowStockPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:sku/edit" element={<ProductFormPage />} />
          <Route path="inventory" element={<Navigate to="/products/low-stock" replace />} />
          <Route path="stores" element={<StoresPage />} />
          <Route
            path="sales"
            element={<PlaceholderPage title="Sales" description="Sales history and invoices." />}
          />
          <Route path="purchases" element={<PurchaseOrdersPage />} />
          <Route path="purchases/orders/new" element={<PurchaseOrderDetailPage />} />
          <Route path="purchases/orders/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="purchases/receive" element={<ReceiveGoodsPage />} />
          <Route path="purchases/suppliers" element={<SuppliersPage />} />
          <Route path="purchases/returns" element={<SupplierReturnsPage />} />
          <Route
            path="customers"
            element={<PlaceholderPage title="Customers" description="Customer directory." />}
          />
          <Route
            path="reports"
            element={<PlaceholderPage title="Reports" description="Business reports." />}
          />
          <Route
            path="settings"
            element={<PlaceholderPage title="Settings" description="Store and account settings." />}
          />
          <Route
            path="users"
            element={
              <PlaceholderPage title="Users & Roles" description="Team access and permissions." />
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
