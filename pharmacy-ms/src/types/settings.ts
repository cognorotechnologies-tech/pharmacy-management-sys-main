
export interface PharmacySettings {
    id: 'global';
    name: string;
    logo_url: string | null;
    tax_rate: number;
    currency: string;
    timezone: string;
    retention_policy: {
        audit_logs: number; // days
        sales: number; // days
    };
    updated_at: string;
    updated_by: string | null;
}

export interface OperatingHours {
    open: string; // "HH:mm"
    close: string; // "HH:mm"
    isOpen: boolean;
}

export interface BranchSettings {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string | null;
    operating_hours: Record<string, OperatingHours>; // Mon-Sun
    receipt_header: string | null;
    receipt_footer: string | null;
    discount_approval_threshold: number; // percentage
    low_stock_reorder_threshold_override: number | null;
}

export interface UserPreferences {
    user_id: string;
    theme: 'light' | 'dark';
    notifications: {
        inventory: boolean;
        expiry: boolean;
        orders: boolean;
        system: boolean;
    };
    pos_preferences: {
        default_payment: string;
        show_patient_search: boolean;
    };
    print_settings: {
        receipt_logo: boolean;
        label_size: 'Dymo 30252' | 'A4 Standard';
        label_fields: string[];
    };
    default_branch_id: string | null;
    updated_at: string;
}

export type SettingsTab = 'general' | 'branch' | 'preferences' | 'print';
