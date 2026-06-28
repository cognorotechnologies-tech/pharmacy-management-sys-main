---
trigger: always_on
---

# Pharmacy Management System — Workspace Rules
 
## Tech Stack
- Frontend: React 18 + TypeScript (strict mode) + Vite + Tailwind CSS
- Backend/DB: Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- State: TanStack React Query v5 (server state) + React Context (auth/ui)
- Forms: React Hook Form + Zod validation
- Router: React Router v6
- Charts: Recharts
- Icons: Lucide React
- Toasts: React Hot Toast
- PDF: jsPDF + react-to-print
- Utils: date-fns, nanoid
 
## File Structure
src/
  pages/          # Route-level page components
  components/     # Reusable UI components
  hooks/          # Custom React hooks
  contexts/       # React contexts (AuthContext, BranchContext)
  lib/            # supabase.ts, utils.ts
  types/          # TypeScript types (database.ts, app.ts)
  services/       # Supabase query functions by domain
 
## Code Standards
- All components: named exports + TypeScript interfaces for props
- All DB calls: wrapped in React Query hooks in /hooks/
- Error handling: always use try/catch, toast on error
- No inline styles — Tailwind only
- All forms validated with Zod schemas
- No any types — strict TypeScript
 
## Roles
super_admin | admin | pharmacist | cashier | inventory_staff
 
## Security Rules
- Never expose service role key to frontend
- RLS enabled on ALL tables
- Sensitive actions require role check in both frontend + RLS
- Audit log every INSERT/UPDATE/DELETE on critical tables
