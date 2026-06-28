// ============================================================
// App-level derived types — composed from database interfaces
// Used for joined queries, UI components, and API responses
// ============================================================

import type {
    Product,
    Batch,
    Inventory,
    Sale,
    SaleItem,
    Patient,
    Prescription,
    PrescriptionItem,
    PurchaseOrder,
    PoItem,
    Supplier,
    Branch,
    Profile,
    InsurancePlan,
    StockAdjustment,
    Notification,
    AuditLog,
} from './database';

// ─── Product + Stock ─────────────────────────────────────────

/** Product joined with inventory and active batches for a specific branch */
export interface ProductWithStock extends Product {
    inventory: Pick<
        Inventory,
        'quantity_on_hand' | 'quantity_reserved' | 'quantity_available'
    > | null;
    batches: BatchSummary[];
    branch: Pick<Branch, 'id' | 'name'> | null;
}

export interface BatchSummary {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity_remaining: number;
    selling_price: number;
    cost_price: number;
    is_expired: boolean;
    days_until_expiry: number;
}

// ─── Sale + Items ────────────────────────────────────────────

/** Sale joined with line items, product info, and cashier */
export interface SaleWithItems extends Sale {
    items: SaleItemWithProduct[];
    cashier: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
    patient: Pick<Patient, 'id' | 'first_name' | 'last_name'> | null;
    branch: Pick<Branch, 'id' | 'name'> | null;
}

export interface SaleItemWithProduct extends SaleItem {
    product: Pick<Product, 'id' | 'name' | 'generic_name' | 'sku' | 'unit'>;
    batch: Pick<Batch, 'id' | 'batch_number' | 'expiry_date'> | null;
}

// ─── Patient + History ───────────────────────────────────────

/** Patient joined with prescriptions, sales, and insurance */
export interface PatientWithHistory extends Patient {
    prescriptions: PrescriptionSummary[];
    sales: SaleSummary[];
    insurance_plan: Pick<
        InsurancePlan,
        'id' | 'plan_name' | 'provider_name' | 'coverage_percentage'
    > | null;
    total_spent: number;
    last_visit: string | null;
}

export interface PrescriptionSummary {
    id: string;
    prescription_number: string;
    prescriber_name: string;
    status: Prescription['status'];
    date_prescribed: string;
    date_dispensed: string | null;
    item_count: number;
}

export interface SaleSummary {
    id: string;
    sale_number: string;
    status: Sale['status'];
    total_amount: number;
    payment_method: Sale['payment_method'];
    created_at: string;
    item_count: number;
}

// ─── Prescription + Items ────────────────────────────────────

export interface PrescriptionWithItems extends Prescription {
    items: PrescriptionItemWithProduct[];
    patient: Pick<Patient, 'id' | 'first_name' | 'last_name' | 'allergies'>;
    branch: Pick<Branch, 'id' | 'name'> | null;
    verified_by_profile: Pick<Profile, 'id' | 'full_name'> | null;
    dispensed_by_profile: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface PrescriptionItemWithProduct extends PrescriptionItem {
    product: Pick<
        Product,
        'id' | 'name' | 'generic_name' | 'strength' | 'formulation' | 'unit'
    >;
}

// ─── Purchase Order + Items ──────────────────────────────────

export interface PurchaseOrderWithItems extends PurchaseOrder {
    items: PoItemWithProduct[];
    supplier: Pick<Supplier, 'id' | 'name' | 'contact_person' | 'phone'>;
    branch: Pick<Branch, 'id' | 'name'>;
    created_by_profile: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface PoItemWithProduct extends PoItem {
    product: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>;
}

// ─── Stock Adjustment (enriched) ─────────────────────────────

export interface StockAdjustmentWithDetails extends StockAdjustment {
    product: Pick<Product, 'id' | 'name' | 'sku'>;
    batch: Pick<Batch, 'id' | 'batch_number'> | null;
    branch: Pick<Branch, 'id' | 'name'>;
    adjusted_by_profile: Pick<Profile, 'id' | 'full_name'>;
}

// ─── Dashboard / Analytics ───────────────────────────────────

export interface DashboardStats {
    total_revenue: number;
    total_sales_count: number;
    total_products: number;
    low_stock_count: number;
    expiring_soon_count: number;
    pending_prescriptions: number;
    pending_orders: number;
    active_patients: number;
}

export interface SalesTrend {
    date: string;
    revenue: number;
    count: number;
}

export interface TopSellingProduct {
    product_id: string;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
}

export interface ExpiryAlert {
    product_id: string;
    product_name: string;
    batch_number: string;
    expiry_date: string;
    quantity_remaining: number;
    days_until_expiry: number;
}

export interface LowStockAlert {
    product_id: string;
    product_name: string;
    sku: string;
    quantity_on_hand: number;
    min_stock_level: number;
    reorder_point: number;
    branch_name: string;
}

// ─── Notification (enriched) ─────────────────────────────────

export interface NotificationWithMeta extends Notification {
    time_ago: string;
}

// ─── Audit Trail ─────────────────────────────────────────────

export interface AuditLogWithUser extends AuditLog {
    user: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
}

export interface FailedLoginAttempt {
    id: string;
    payload: Record<string, any>;
    created_at: string;
    ip_address: string;
}

// ─── Pagination & Filtering ──────────────────────────────────

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

export interface SortConfig {
    column: string;
    direction: 'asc' | 'desc';
}

export interface DateRange {
    from: string;
    to: string;
}

export interface SearchFilters {
    query: string;
    branch_id?: string;
    date_range?: DateRange;
    status?: string;
    category?: string;
    sort?: SortConfig;
    page: number;
    per_page: number;
}
