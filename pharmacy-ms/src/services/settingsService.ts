import { supabase } from '@/lib/supabase';
import type {
    PharmacySettings,
    BranchSettings,
    UserPreferences
} from '@/types/settings';

export const settingsService = {
    /** Global Pharmacy Settings */
    async getGeneralSettings(): Promise<PharmacySettings> {
        const { data, error } = await supabase
            .from('pharmacy_settings')
            .select('*')
            .eq('id', 'global')
            .single();

        if (error) throw error;
        return data as PharmacySettings;
    },

    async updateGeneralSettings(updates: Partial<PharmacySettings>): Promise<void> {
        const { error } = await supabase
            .from('pharmacy_settings')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
                updated_by: (await supabase.auth.getUser()).data.user?.id
            })
            .eq('id', 'global');

        if (error) throw error;
    },

    /** Logo Upload */
    async uploadLogo(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `logo_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `branding/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('pharmacy-assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('pharmacy-assets')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    /** Branch Settings */
    async getBranchSettings(branchId: string): Promise<BranchSettings> {
        const { data, error } = await supabase
            .from('branches')
            .select('id, name, address, phone, email, settings')
            .eq('id', branchId)
            .single();

        if (error) throw error;

        const branch = data as any;
        const settings = branch.settings || {};

        return {
            id: branch.id,
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            email: branch.email,
            operating_hours: settings.operating_hours || {},
            receipt_header: settings.receipt_header || null,
            receipt_footer: settings.receipt_footer || null,
            discount_approval_threshold: settings.discount_approval_threshold || 10,
            low_stock_reorder_threshold_override: settings.low_stock_reorder_threshold_override || null,
        };
    },

    async updateBranchSettings(branchId: string, updates: Partial<BranchSettings>): Promise<void> {
        // We need to separate branch table columns from the JSONB settings
        const coreUpdates: any = {};
        if (updates.name) coreUpdates.name = updates.name;
        if (updates.address) coreUpdates.address = updates.address;
        if (updates.phone) coreUpdates.phone = updates.phone;
        if (updates.email !== undefined) coreUpdates.email = updates.email;

        // Fetch current settings to merge
        const { data: currentBranch } = await supabase
            .from('branches')
            .select('settings')
            .eq('id', branchId)
            .single();

        const currentSettings = (currentBranch?.settings as any) || {};

        const settingsUpdates: any = { ...currentSettings };
        if (updates.operating_hours) settingsUpdates.operating_hours = updates.operating_hours;
        if (updates.receipt_header !== undefined) settingsUpdates.receipt_header = updates.receipt_header;
        if (updates.receipt_footer !== undefined) settingsUpdates.receipt_footer = updates.receipt_footer;
        if (updates.discount_approval_threshold !== undefined) settingsUpdates.discount_approval_threshold = updates.discount_approval_threshold;
        if (updates.low_stock_reorder_threshold_override !== undefined) settingsUpdates.low_stock_reorder_threshold_override = updates.low_stock_reorder_threshold_override;

        const { error } = await supabase
            .from('branches')
            .update({
                ...coreUpdates,
                settings: settingsUpdates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', branchId);

        if (error) throw error;
    },

    /** User Preferences */
    async getUserPreferences(userId: string): Promise<UserPreferences> {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

        if (!data) {
            // Return defaults if no preferences exist yet
            return {
                user_id: userId,
                theme: 'light',
                notifications: { inventory: true, expiry: true, orders: true, system: true },
                pos_preferences: { default_payment: 'cash', show_patient_search: true },
                print_settings: { receipt_logo: true, label_size: 'Dymo 30252', label_fields: ['name', 'dosage', 'expiry'] },
                default_branch_id: null,
                updated_at: new Date().toISOString(),
            };
        }

        // Merge with defaults in case of new fields
        return {
            ...data,
            print_settings: (data as any).print_settings || { receipt_logo: true, label_size: 'Dymo 30252', label_fields: ['name', 'dosage', 'expiry'] },
        } as UserPreferences;
    },

    async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<void> {
        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString(),
            });

        if (error) throw error;
    },
};
