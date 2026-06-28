import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/settingsService';
import type {
    PharmacySettings,
    BranchSettings,
    UserPreferences
} from '@/types/settings';
import { toast } from 'react-hot-toast';

const KEYS = {
    all: ['settings'] as const,
    general: () => [...KEYS.all, 'general'] as const,
    branch: (id: string) => [...KEYS.all, 'branch', id] as const,
    user: (id: string) => [...KEYS.all, 'user', id] as const,
};

/** General Settings Hooks */
export function useGeneralSettings() {
    return useQuery({
        queryKey: KEYS.general(),
        queryFn: () => settingsService.getGeneralSettings(),
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateGeneralSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (updates: Partial<PharmacySettings>) =>
            settingsService.updateGeneralSettings(updates),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.general() });
            toast.success('General settings updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update settings');
        }
    });
}

/** Branch Settings Hooks */
export function useBranchSettings(branchId: string | null) {
    return useQuery({
        queryKey: KEYS.branch(branchId || 'none'),
        queryFn: () => settingsService.getBranchSettings(branchId!),
        enabled: !!branchId,
    });
}

export function useUpdateBranchSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ branchId, updates }: { branchId: string; updates: Partial<BranchSettings> }) =>
            settingsService.updateBranchSettings(branchId, updates),
        onSuccess: (_, { branchId }) => {
            qc.invalidateQueries({ queryKey: KEYS.branch(branchId) });
            toast.success('Branch settings updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update branch settings');
        }
    });
}

/** User Preferences Hooks */
export function useUserPreferences(userId: string | null) {
    return useQuery({
        queryKey: KEYS.user(userId || 'none'),
        queryFn: () => settingsService.getUserPreferences(userId!),
        enabled: !!userId,
    });
}

export function useUpdateUserPreferences() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, updates }: { userId: string; updates: Partial<UserPreferences> }) =>
            settingsService.updateUserPreferences(userId, updates),
        onSuccess: (_, { userId }) => {
            qc.invalidateQueries({ queryKey: KEYS.user(userId) });
            toast.success('Preferences saved');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to save preferences');
        }
    });
}
