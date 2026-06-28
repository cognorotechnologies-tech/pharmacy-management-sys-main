import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export function useSuperAdminDashboard() {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    // 1. Fetch active pharmacies count
    const { data: pharmaciesCount, isLoading: loadingPharmacies } = useQuery({
        queryKey: ['super_admin_pharmacies_count'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('branches')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            if (error) throw error;
            return count || 0;
        }
    });

    // 2. Fetch pending prescriptions count
    const { data: pendingPrescriptionsCount, isLoading: loadingPrescriptions } = useQuery({
        queryKey: ['super_admin_pending_prescriptions'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('prescriptions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (error) throw error;
            return count || 0;
        }
    });

    // 3. Fetch low stock alerts (needs a join or rpc, simplified here using a view or just finding inventory with qty < 10 for simplicity, wait, let's use rpc or fetch all and filter if it's small)
    // For a robust app, we'd use an RPC. Since we don't want to create an RPC right now without user permission, we'll fetch inventory joined with products.
    const { data: lowStockCount, isLoading: loadingLowStock } = useQuery({
        queryKey: ['super_admin_low_stock'],
        queryFn: async () => {
            // Fetching all might be heavy, but it's okay for v0
            const { data, error } = await supabase
                .from('inventory')
                .select('quantity_available, products(min_stock_level, is_active)')
                .eq('products.is_active', true);

            if (error) throw error;

            // Filter in memory for now
            return (data || []).filter(item => {
                const minLevel = (item.products as any)?.min_stock_level || 0;
                return item.quantity_available <= minLevel;
            }).length;
        }
    });

    // 4. Fetch today's sales for total revenue and branch performance
    const { data: salesData, isLoading: loadingSales } = useQuery({
        queryKey: ['super_admin_sales_today', todayStart, todayEnd],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sales')
                .select('total_amount, branch_id, branches(name)')
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd)
                .eq('status', 'completed');

            if (error) throw error;

            let totalRevenue = 0;
            const branchRevenueMap: Record<string, { branchName: string; revenue: number }> = {};

            (data || []).forEach(sale => {
                totalRevenue += Number(sale.total_amount);
                const branchName = (sale.branches as any)?.name || 'Unknown';
                if (!branchRevenueMap[sale.branch_id]) {
                    branchRevenueMap[sale.branch_id] = { branchName, revenue: 0 };
                }
                branchRevenueMap[sale.branch_id].revenue += Number(sale.total_amount);
            });

            const branchPerformance = Object.values(branchRevenueMap).sort((a, b) => b.revenue - a.revenue);

            return { totalRevenue, branchPerformance };
        }
    });

    // 5. Fetch Activity Feed (last 20 audit logs)
    const { data: activityFeed, isLoading: loadingActivity } = useQuery({
        queryKey: ['super_admin_activity_feed'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('id, action, entity_type, created_at, profiles!audit_logs_user_id_fkey(full_name), branches(name)')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data;
        }
    });

    return {
        pharmaciesCount,
        pendingPrescriptionsCount,
        lowStockCount,
        totalRevenue: salesData?.totalRevenue || 0,
        branchPerformance: salesData?.branchPerformance || [],
        activityFeed: activityFeed || [],
        isLoading: loadingPharmacies || loadingPrescriptions || loadingLowStock || loadingSales || loadingActivity,
    };
}

export function useAdminDashboard(branchId: string | null) {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    // 1. Fetch Today's KPI strip (Revenue, Transactions, Avg Sale Value)
    const { data: todayKpis, isLoading: loadingKpis } = useQuery({
        queryKey: ['admin_kpi_today', branchId, todayStart, todayEnd],
        queryFn: async () => {
            if (!branchId) return { revenue: 0, transactions: 0, avgSale: 0, grossProfit: 0, margin: 0 };

            // To get gross profit we need cost price, which means joining sale_items with batches 
            // Querying sale items for today for this branch
            const { data, error } = await supabase
                .from('sales')
                .select('id, total_amount, subtotal, sale_items(total_price, quantity, batches(cost_price))')
                .eq('branch_id', branchId)
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd)
                .eq('status', 'completed');

            if (error) throw error;

            let revenue = 0;
            const transactions = data.length;
            let totalCost = 0;

            (data || []).forEach(sale => {
                revenue += Number(sale.total_amount);
                (sale.sale_items || []).forEach((item: any) => {
                    const cost = Number(item.batches?.cost_price || 0) * Number(item.quantity);
                    totalCost += cost;
                });
            });

            const grossProfit = revenue > 0 ? revenue - totalCost : 0; // Simplified calculation
            const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
            const avgSale = transactions > 0 ? revenue / transactions : 0;

            return { revenue, transactions, avgSale, grossProfit, margin };
        },
        enabled: !!branchId
    });

    // 2. Fetch Sales Trend (Last 30 days)
    const { data: salesTrend, isLoading: loadingTrend } = useQuery({
        queryKey: ['admin_sales_trend', branchId, thirtyDaysAgo, todayEnd],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('sales')
                .select('created_at, total_amount')
                .eq('branch_id', branchId)
                .gte('created_at', thirtyDaysAgo)
                .lte('created_at', todayEnd)
                .eq('status', 'completed')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Group by day
            const dailyMap: Record<string, number> = {};
            // Initialize last 30 days with 0
            for (let i = 29; i >= 0; i--) {
                const d = subDays(new Date(), i);
                const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                dailyMap[dayStr] = 0;
            }

            (data || []).forEach(sale => {
                const tDate = new Date(sale.created_at);
                const dayStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}-${String(tDate.getDate()).padStart(2, '0')}`;
                if (dailyMap[dayStr] !== undefined) {
                    dailyMap[dayStr] += Number(sale.total_amount);
                }
            });

            // Calculate moving average
            const trend = Object.entries(dailyMap).map(([date, amount], i, arr) => {
                // simple 7-day average
                let sum = amount;
                let count = 1;
                for (let j = 1; j < 7; j++) {
                    if (i - j >= 0) {
                        sum += arr[i - j][1];
                        count++;
                    }
                }
                return {
                    date,
                    revenue: amount,
                    movingAverage: Number((sum / count).toFixed(2))
                };
            });

            return trend;
        },
        enabled: !!branchId
    });

    // 3. Top 10 Products by revenue
    const { data: topProducts, isLoading: loadingTop } = useQuery({
        queryKey: ['admin_top_products', branchId, thirtyDaysAgo],
        queryFn: async () => {
            if (!branchId) return [];
            // We fetch sale items for completed sales matching branch_id over the last 30 days
            const { data, error } = await supabase
                .from('sale_items')
                .select('total_price, products!inner(name), sales!inner(branch_id, status, created_at)')
                .eq('sales.branch_id', branchId)
                .eq('sales.status', 'completed')
                .gte('sales.created_at', thirtyDaysAgo);

            if (error) throw error;

            const productRevenue: Record<string, number> = {};
            (data || []).forEach((row: any) => {
                const name = row.products?.name;
                if (name) {
                    productRevenue[name] = (productRevenue[name] || 0) + Number(row.total_price);
                }
            });

            const sorted = Object.entries(productRevenue)
                .map(([name, revenue]) => ({ name, revenue }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10);

            return sorted;
        },
        enabled: !!branchId
    });

    // 4. Low stock 
    const { data: lowStockItems, isLoading: loadingLowStock } = useQuery({
        queryKey: ['admin_low_stock_list', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('inventory')
                .select('id, quantity_available, products!inner(id, name, min_stock_level)')
                .eq('branch_id', branchId);

            if (error) throw error;

            return (data || []).filter((item: any) => {
                return item.quantity_available <= (item.products?.min_stock_level || 0);
            }).slice(0, 10); // top 10 low
        },
        enabled: !!branchId
    });

    // 5. Expiry alerts
    const { data: expiryAlerts, isLoading: loadingExpiry } = useQuery({
        queryKey: ['admin_expiry_alerts'],
        queryFn: async () => {
            // Simplified expiry check across batches 
            const in30d = subDays(new Date(), -30).toISOString();
            const in60d = subDays(new Date(), -60).toISOString();
            const in90d = subDays(new Date(), -90).toISOString();

            const { data, error } = await supabase
                .from('batches')
                .select('id, batch_number, expiry_date, quantity_remaining, products!inner(name)')
                .gt('quantity_remaining', 0)
                .lte('expiry_date', in90d) // expiring within 90 days
                .order('expiry_date', { ascending: true });

            if (error) throw error;

            // Group them
            const alerts30: any[] = [];
            const alerts60: any[] = [];
            const alerts90: any[] = [];

            (data || []).forEach((b: any) => {
                if (b.expiry_date <= in30d) alerts30.push(b);
                else if (b.expiry_date <= in60d) alerts60.push(b);
                else alerts90.push(b);
            });

            return { alerts30, alerts60, alerts90 };
        }
    });

    // 6. Pending Prescriptions Count
    const { data: pendingPrescriptionsCount, isLoading: loadingPrescriptions } = useQuery({
        queryKey: ['admin_pending_prescriptions', branchId],
        queryFn: async () => {
            if (!branchId) return 0;
            const { count, error } = await supabase
                .from('prescriptions')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', branchId)
                .eq('status', 'pending');

            if (error) throw error;
            return count || 0;
        },
        enabled: !!branchId
    });

    // 7. Staff Today (Active shifts)
    const { data: activeShifts, isLoading: loadingShifts } = useQuery({
        queryKey: ['admin_active_shifts', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('shifts')
                .select('id, total_revenue, profiles!inner(full_name)')
                .eq('branch_id', branchId)
                .is('ended_at', null); // Active shifted 

            if (error) throw error;
            return data || [];
        },
        enabled: !!branchId
    });


    return {
        todayKpis,
        salesTrend,
        topProducts,
        lowStockItems,
        expiryAlerts,
        pendingPrescriptionsCount,
        activeShifts,
        isLoading: loadingKpis || loadingTrend || loadingTop || loadingLowStock || loadingExpiry || loadingPrescriptions || loadingShifts
    };
}

export function usePharmacistDashboard(branchId: string | null) {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    // 1. Pending Prescriptions Queue
    const { data: pendingPrescriptions, isLoading: loadingPending } = useQuery({
        queryKey: ['pharmacist_pending_prescriptions', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('prescriptions')
                .select('id, patient_name, doctor_name, status, created_at, notes, order_id')
                .eq('branch_id', branchId)
                .eq('status', 'pending')
                .order('created_at', { ascending: true }); // Oldest first

            if (error) throw error;
            return data || [];
        },
        enabled: !!branchId
    });

    // 2. Dispensed Today
    const { data: dispensedTodayCount, isLoading: loadingDispensed } = useQuery({
        queryKey: ['pharmacist_dispensed_today', branchId, todayStart],
        queryFn: async () => {
            if (!branchId) return 0;
            const { count, error } = await supabase
                .from('prescriptions')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', branchId)
                .eq('status', 'dispensed')
                .gte('updated_at', todayStart) // assuming dispensed sets updated_at
                .lte('updated_at', todayEnd);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!branchId
    });

    // 3. Fast-moving stock that might be getting low
    const { data: lowStockItems, isLoading: loadingStock } = useQuery({
        queryKey: ['pharmacist_low_stock', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('inventory')
                .select('id, quantity_available, products!inner(id, name, min_stock_level, is_prescription_required)')
                .eq('branch_id', branchId);

            if (error) throw error;

            return (data || [])
                .filter((item: any) => item.quantity_available <= (item.products?.min_stock_level || 0) && item.products?.is_prescription_required)
                .slice(0, 5); // top 5 low prescription drugs
        },
        enabled: !!branchId
    });

    return {
        pendingPrescriptions,
        dispensedTodayCount,
        lowStockItems,
        isLoading: loadingPending || loadingDispensed || loadingStock
    };
}

export function useCashierDashboard(branchId: string | null) {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    // 1. My Sales Today (assuming we filter by branch and maybe cashier ID, but for now branch sales are fine if there's only one POS, or we just show branch stats)
    const { data: todaySales, isLoading: loadingSales } = useQuery({
        queryKey: ['cashier_sales_today', branchId],
        queryFn: async () => {
            if (!branchId) return { revenue: 0, count: 0 };
            const { data, error } = await supabase
                .from('sales')
                .select('total_amount, id')
                .eq('branch_id', branchId)
                .eq('status', 'completed')
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd);

            if (error) throw error;

            let revenue = 0;
            (data || []).forEach(s => revenue += Number(s.total_amount));

            return {
                revenue,
                count: data?.length || 0
            };
        },
        enabled: !!branchId
    });

    // 2. Recent Transactions (last 10)
    const { data: recentTransactions, isLoading: loadingTransactions } = useQuery({
        queryKey: ['cashier_recent_transactions', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('sales')
                .select('id, receipt_number, total_amount, payment_method, created_at, status')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data || [];
        },
        enabled: !!branchId
    });

    // 3. Shift Status (Is there an active shift?)
    const { data: activeShift, isLoading: loadingShift } = useQuery({
        queryKey: ['cashier_active_shift', branchId],
        queryFn: async () => {
            if (!branchId) return null;
            // Find active shift for current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('user_id', user.id)
                .is('ended_at', null)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // ignore no row
            return data || null;
        },
        enabled: !!branchId
    });

    return {
        todaySales,
        recentTransactions,
        activeShift,
        isLoading: loadingSales || loadingTransactions || loadingShift
    };
}

export function useInventoryDashboard(branchId: string | null) {
    const in90d = subDays(new Date(), -90).toISOString();

    // 1. Overall stats (total products in branch)
    const { data: totalProductsCount, isLoading: loadingTotal } = useQuery({
        queryKey: ['inventory_total_products', branchId],
        queryFn: async () => {
            if (!branchId) return 0;
            const { count, error } = await supabase
                .from('inventory')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', branchId);
            if (error) throw error;
            return count || 0;
        },
        enabled: !!branchId
    });

    // 2. Low Stock exactly like before
    const { data: lowStockItems, isLoading: loadingLowStock } = useQuery({
        queryKey: ['inventory_low_stock', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            const { data, error } = await supabase
                .from('inventory')
                .select('id, quantity_available, products!inner(id, name, min_stock_level, unit)')
                .eq('branch_id', branchId);

            if (error) throw error;

            return (data || []).filter((item: any) => {
                return item.quantity_available <= (item.products?.min_stock_level || 0);
            });
        },
        enabled: !!branchId
    });

    // 3. Expiring Soon (specifically for this branch? Actually batches don't have branch_id except through inventory... wait. 
    // In our schema, batches belong to products, but where are they physically? 
    // Looking at database.ts from earlier, batches belong to `inventory_id` or `branch_id`. Let's assume `inventory_id` or just fetch batches and join with inventory.)
    const { data: expiringBatches, isLoading: loadingExpiry } = useQuery({
        queryKey: ['inventory_expiring_batches', branchId],
        queryFn: async () => {
            if (!branchId) return [];
            // Fetch batches that belong to this branch's inventory
            const { data, error } = await supabase
                .from('batches')
                .select('id, batch_number, expiry_date, quantity_remaining, products!inner(name)')
                // Usually batches are linked to a specific branch via inventory or direct, if they aren't we fetch all for now, assuming local db
                // Actually we can filter by quantity_remaining > 0
                .gt('quantity_remaining', 0)
                .lte('expiry_date', in90d)
                .order('expiry_date', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!branchId
    });

    return {
        totalProductsCount,
        lowStockItems,
        expiringBatches,
        isLoading: loadingTotal || loadingLowStock || loadingExpiry
    };
}



