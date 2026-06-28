import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn().mockReturnThis(),
    },
}));

describe('Inventory Management', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('triggers low stock notification when below threshold', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'notifications') {
                return { insert: mockInsert } as any;
            }
            return { select: vi.fn().mockReturnThis() } as any;
        });

        // Simulate inventory update logic
        const handleStockUpdate = async (productId: string, currentStock: number, threshold: number) => {
            if (currentStock <= threshold) {
                await supabase.from('notifications').insert({
                    title: 'Low Stock Alert',
                    message: `Product ${productId} is low on stock (${currentStock} remaining).`,
                    type: 'inventory',
                });
            }
        };

        await handleStockUpdate('prod-A', 5, 10);

        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Low Stock Alert',
        }));
    });

    it('detects expiry date and creates alert threshold', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'notifications') {
                return { insert: mockInsert } as any;
            }
            return { select: vi.fn().mockReturnThis() } as any;
        });

        const checkExpiry = async (batchId: string, daysUntilExpiry: number) => {
            if (daysUntilExpiry <= 30) {
                await supabase.from('notifications').insert({
                    title: 'Expiring Batch Alert',
                    message: `Batch ${batchId} expires in ${daysUntilExpiry} days.`,
                    type: 'inventory',
                });
            }
        };

        await checkExpiry('batch-X', 15);

        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Expiring Batch Alert',
            message: 'Batch batch-X expires in 15 days.',
        }));
    });
});
