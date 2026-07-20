# Vyntra UI

React + TypeScript + **Tailwind CSS** UI for V-POS (aligned with the VPOS HTML mockup design).

## Stack

- React 19
- TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- [Remix Icon](https://remixicon.com) (`remixicon` package)
- Vite
- React Router

### Icons

Use the shared wrapper:

```tsx
import { Icon } from './components'

<Icon name="search-line" />
// → <i class="ri-search-line" />
```

## Styling approach

- **Prefer Tailwind utilities** on components and screens.
- Design tokens live in `src/index.css` via `@theme` (`vpos-dark`, `vpos-primary`, …).
- Palette: [Color Hunt](https://colorhunt.co/palette/0c2b4e1a3d641d546cf4f4f4) — `#0C2B4E` · `#1A3D64` · `#1D546C` · `#F4F4F4`
- Avoid large custom CSS files; only minimal base styles remain in `index.css`.

| Token | Hex | Role |
| --- | --- | --- |
| `vpos-dark` / `vpos-text` | `#0C2B4E` | Sidebar, text |
| `vpos-accent` / `vpos-primary-2` | `#1A3D64` | Secondary accent / charts / links |
| `vpos-primary` | `#1D546C` | Buttons, active states |
| `vpos-bg` | `#F4F4F4` | Page background |

Example:

```tsx
<button className="rounded-[10px] bg-vpos-primary px-4 text-white hover:bg-vpos-dark">
  Save
</button>
```

## Routes (React Router)

| Path | Screen |
| --- | --- |
| `/` | Overview (dashboard) |
| `/pos` | Point of Sale |
| `/products` | Product catalog |
| `/products/new` | Create product |
| `/products/:sku/edit` | Edit product |
| `/products/stock-movement` | Stock movement (under Products) |
| `/products/low-stock` | Low stock (under Products) |
| `/inventory` | Redirects to low stock |
| `/purchases` | Purchase orders |
| `/purchases/receive` | Receive goods |
| `/purchases/suppliers` | Suppliers |
| `/purchases/returns` | Supplier returns |
| `/purchases/orders/new`, `/purchases/orders/:id` | Create / view PO |
| `/sales`, `/customers`, `/reports`, `/settings`, `/users` | Placeholders |

Defined in `src/App.tsx` + `src/lib/paths.ts`. Sidebar uses `NavLink`.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Components

Import from `src/components`:

`Button`, `MetricCard`, `Status`, `ProductThumb`, `FormField`, `Toggle`, `ProductMode`, `UploadZone`, `Sidebar`, `Topbar`, `StoreSwitcher`
