import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';

interface DateRange {
    startDate: string;
    endDate: string;
}

export function useSalesReports(dateRange: DateRange, branchId: string | null) {
    return useQuery({
        queryKey: ['reports_sales', dateRange, branchId],
        queryFn: async () => {
            let query = supabase
                .from('sales')
                .select(`
          id, total_amount, discount_amount, payment_method, cashier_id, created_at,
          profiles:cashier_id(full_name),
          sale_items(
            quantity, total_price,
            products:product_id(name, category)
          )
        `)
                .eq('status', 'completed')
                .gte('created_at', dateRange.startDate)
                .lte('created_at', dateRange.endDate);

            if (branchId) {
                query = query.eq('branch_id', branchId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Aggregations
            let totalRevenue = 0;
            let totalDiscounts = 0;
            const totalTransactions = data?.length || 0;

            const dailySales: Record<string, number> = {};
            const productSales: Record<string, { quantity: number; revenue: number }> = {};
            const cashierSales: Record<string, { count: number; revenue: number; name: string }> = {};
            const paymentMethods: Record<string, number> = {};
            const categorySales: Record<string, { revenue: number }> = {};

            (data || []).forEach(sale => {
                const amount = Number(sale.total_amount);
                const discount = Number(sale.discount_amount || 0);
                totalRevenue += amount;
                totalDiscounts += discount;

                // Daily
                const day = format(parseISO(sale.created_at), 'MMM dd');
                dailySales[day] = (dailySales[day] || 0) + amount;

                // Cashier
                const cashierName = (sale.profiles as any)?.full_name || 'Unknown';
                if (!cashierSales[sale.cashier_id]) cashierSales[sale.cashier_id] = { count: 0, revenue: 0, name: cashierName };
                cashierSales[sale.cashier_id].count += 1;
                cashierSales[sale.cashier_id].revenue += amount;

                // Payment Methods
                const method = sale.payment_method || 'unknown';
                paymentMethods[method] = (paymentMethods[method] || 0) + amount;

                // Items
                (sale.sale_items || []).forEach((item: any) => {
                    const prodName = item.products?.name || 'Unknown Product';
                    const catStr = item.products?.category || 'uncategorized';
                    const itemRevenue = Number(item.total_price);
                    const itemQty = Number(item.quantity);

                    if (!productSales[prodName]) productSales[prodName] = { quantity: 0, revenue: 0 };
                    productSales[prodName].quantity += itemQty;
                    productSales[prodName].revenue += itemRevenue;

                    if (!categorySales[catStr]) categorySales[catStr] = { revenue: 0 };
                    categorySales[catStr].revenue += itemRevenue;
                });
            });

            // Format for charts
            const dailyChart = Object.entries(dailySales).map(([date, amount]) => ({ date, amount })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const topProducts = Object.entries(productSales)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 20);

            const cashierPerformance = Object.values(cashierSales).sort((a, b) => b.revenue - a.revenue);

            const paymentChart = Object.entries(paymentMethods).map(([name, value]) => ({ name, value }));
            const categoryChart = Object.entries(categorySales).map(([name, stats]) => ({ name, value: stats.revenue })).sort((a, b) => b.value - a.value);

            return {
                totalRevenue,
                totalDiscounts,
                totalTransactions,
                avgDiscount: totalTransactions > 0 ? (totalDiscounts / totalTransactions) : 0,
                discountPercentage: totalRevenue > 0 ? (totalDiscounts / (totalRevenue + totalDiscounts) * 100) : 0,
                dailyChart,
                topProducts,
                cashierPerformance,
                paymentChart,
                categoryChart
            };
        },
        enabled: !!dateRange.startDate && !!dateRange.endDate
    });
}

export function useInventoryReports(dateRange: DateRange, branchId: string | null) {
    return useQuery({
        queryKey: ['reports_inventory', dateRange, branchId],
        queryFn: async () => {
            // 1. Fetch Inventory for Valuation & ABC base
            let invQuery = supabase
                .from('inventory')
                .select(`
          product_id, quantity_available,
          products!inner(name, category, batches(cost_price, quantity_remaining))
        `);

            if (branchId) {
                invQuery = invQuery.eq('branch_id', branchId);
            }

            const { data: invData, error: invError } = await invQuery;
            if (invError) throw invError;

            // 2. Fetch Sales for ABC Analysis
            let salesQuery = supabase
                .from('sale_items')
                .select(`
           product_id, total_price, quantity,
           sales!inner(branch_id, created_at, status)
        `)
                .eq('sales.status', 'completed')
                .gte('sales.created_at', dateRange.startDate)
                .lte('sales.created_at', dateRange.endDate);

            if (branchId) {
                salesQuery = salesQuery.eq('sales.branch_id', branchId);
            }

            const { data: salesData, error: salesError } = await salesQuery;
            if (salesError) throw salesError;

            // Calculate Valuation
            let totalStockValue = 0;
            const stockValuation: any[] = [];
            const productIdsInBranch = new Set<string>();

            (invData || []).forEach((item: any) => {
                productIdsInBranch.add(item.product_id);
                let weightedCost = 0;
                const batches = item.products?.batches || [];
                const totalBatchQty = batches.reduce((sum: number, b: any) => sum + Number(b.quantity_remaining), 0);

                if (totalBatchQty > 0) {
                    weightedCost = batches.reduce((sum: number, b: any) =>
                        sum + (Number(b.cost_price) * (Number(b.quantity_remaining) / totalBatchQty))
                        , 0);
                } else if (batches.length > 0) {
                    // Fallback to highest cost price if all quantities are 0 but batches exist
                    weightedCost = Math.max(...batches.map((b: any) => Number(b.cost_price)));
                }

                const value = weightedCost * Number(item.quantity_available);
                totalStockValue += value;

                if (item.quantity_available > 0) {
                    stockValuation.push({
                        product_name: item.products?.name,
                        category: item.products?.category,
                        quantity: item.quantity_available,
                        unit_cost: weightedCost,
                        total_value: value
                    });
                }
            });
            stockValuation.sort((a, b) => b.total_value - a.total_value);

            // ABC Analysis
            const productRevenue: Record<string, { revenue: number; name: string }> = {};
            let totalPeriodRevenue = 0;

            (salesData || []).forEach((si: any) => {
                const foundProd = invData?.find(i => i.product_id === si.product_id);
                const pName = (foundProd?.products as any)?.name || 'Unknown Product';
                const rev = Number(si.total_price);
                totalPeriodRevenue += rev;
                if (!productRevenue[si.product_id]) productRevenue[si.product_id] = { revenue: 0, name: pName };
                productRevenue[si.product_id].revenue += rev;
            });

            const sortedProducts = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue);
            let cumulative = 0;
            const abcAnalysis = sortedProducts.map(p => {
                cumulative += p.revenue;
                const cumPerc = totalPeriodRevenue > 0 ? (cumulative / totalPeriodRevenue) * 100 : 0;
                let grade = 'C';
                if (cumPerc <= 80) grade = 'A';
                else if (cumPerc <= 95) grade = 'B';
                return {
                    name: p.name,
                    revenue: p.revenue,
                    percentage: totalPeriodRevenue > 0 ? (p.revenue / totalPeriodRevenue) * 100 : 0,
                    grade
                };
            });

            // Expiry Report
            const { data: expiryData, error: expiryError } = await supabase
                .from('batches')
                .select('batch_number, expiry_date, quantity_remaining, cost_price, products!inner(name, id)')
                .gt('quantity_remaining', 0)
                .gte('expiry_date', dateRange.startDate)
                .lte('expiry_date', dateRange.endDate);

            if (expiryError) throw expiryError;

            const relevantExpiries = (expiryData || []).filter((b: any) =>
                !branchId || productIdsInBranch.has(b.products.id)
            ).map((b: any) => ({
                product_name: b.products?.name,
                batch_number: b.batch_number,
                expiry_date: b.expiry_date,
                quantity: b.quantity_remaining,
                potential_loss: Number(b.quantity_remaining) * Number(b.cost_price)
            })).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

            // Simplified Movement
            let moveQuery = supabase
                .from('stock_adjustments')
                .select('adjustment_type, quantity_adjusted')
                .gte('created_at', dateRange.startDate)
                .lte('created_at', dateRange.endDate);
            if (branchId) moveQuery = moveQuery.eq('branch_id', branchId);

            const { data: moveData, error: moveError } = await moveQuery;
            if (moveError) throw moveError;

            let totalIn = 0;
            let totalOut = 0;
            (moveData || []).forEach((m: any) => {
                const qty = Number(m.quantity_adjusted);
                if (qty > 0) totalIn += qty;
                else totalOut += Math.abs(qty);
            });

            const stockMovement = [
                { name: 'Stock In', value: totalIn },
                { name: 'Stock Out', value: totalOut }
            ];

            return {
                totalStockValue,
                activeProductsCount: stockValuation.length,
                stockValuation: stockValuation.slice(0, 100),
                abcAnalysis,
                expiringBatches: relevantExpiries,
                stockMovement
            };
        },
        enabled: !!dateRange.startDate && !!dateRange.endDate
    });
}

export function useFinancialReports(dateRange: DateRange, branchId: string | null) {
    return useQuery({
        queryKey: ['reports_financial', dateRange, branchId],
        queryFn: async () => {
            let query = supabase
                .from('sales')
                .select(`
          created_at,
          total_amount,
          discount_amount,
          insurance_amount,
          sale_items(
            quantity,
            total_price,
            batches:batch_id(cost_price)
          )
        `)
                .eq('status', 'completed')
                .gte('created_at', dateRange.startDate)
                .lte('created_at', dateRange.endDate);

            if (branchId) {
                query = query.eq('branch_id', branchId);
            }

            const { data, error } = await query;
            if (error) throw error;

            let totalRevenue = 0;
            let totalCogs = 0;
            let totalDiscounts = 0;
            let totalInsurance = 0;
            const dailyFin: Record<string, { revenue: number; cogs: number; profit: number }> = {};

            (data || []).forEach((sale: any) => {
                const revenue = Number(sale.total_amount);
                const discount = Number(sale.discount_amount || 0);
                const insurance = Number(sale.insurance_amount || 0);

                totalRevenue += revenue;
                totalDiscounts += discount;
                totalInsurance += insurance;

                let saleCogs = 0;
                (sale.sale_items || []).forEach((item: any) => {
                    const qty = Number(item.quantity);
                    const cost = Number((item.batches as any)?.cost_price || 0);
                    saleCogs += (qty * cost);
                });

                totalCogs += saleCogs;

                const day = format(parseISO(sale.created_at), 'MMM dd');
                if (!dailyFin[day]) dailyFin[day] = { revenue: 0, cogs: 0, profit: 0 };
                dailyFin[day].revenue += revenue;
                dailyFin[day].cogs += saleCogs;
                dailyFin[day].profit += (revenue - saleCogs);
            });

            const grossProfit = totalRevenue - totalCogs;
            const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

            const dailyTrendChart = Object.entries(dailyFin)
                .map(([date, stats]) => ({ date, ...stats }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return {
                totalRevenue,
                totalCogs,
                grossProfit,
                profitMargin,
                totalDiscounts,
                totalInsurance,
                dailyTrendChart
            };
        },
        enabled: !!dateRange.startDate && !!dateRange.endDate
    });
}

export function usePrescriptionReports(dateRange: DateRange, branchId: string | null) {
    return useQuery({
        queryKey: ['reports_prescription', dateRange, branchId],
        queryFn: async () => {
            let query = supabase
                .from('prescriptions')
                .select(`
          id, prescription_number, status, date_received, date_dispensed, prescriber_name,
          dispensed_by,
          patient:patient_id(first_name, last_name),
          profiles:dispensed_by(full_name),
          prescription_items(
            quantity_dispensed,
            products:product_id(name, is_controlled)
          )
        `)
                .gte('created_at', dateRange.startDate)
                .lte('created_at', dateRange.endDate);

            if (branchId) {
                query = query.eq('branch_id', branchId);
            }

            const { data, error } = await query;
            if (error) throw error;

            let totalPending = 0;
            let totalFilled = 0;
            let totalPartial = 0;
            const pharmacistStats: Record<string, { count: number; name: string }> = {};
            const controlledSubstanceLog: any[] = [];

            (data || []).forEach((rx: any) => {
                if (rx.status === 'pending') totalPending++;
                if (rx.status === 'dispensed' || rx.status === 'completed') totalFilled++;
                if (rx.status === 'partially_dispensed') totalPartial++;

                if (rx.dispensed_by) {
                    const pharmName = (rx.profiles as any)?.full_name || 'Unknown User';
                    if (!pharmacistStats[rx.dispensed_by]) pharmacistStats[rx.dispensed_by] = { count: 0, name: pharmName };
                    pharmacistStats[rx.dispensed_by].count++;
                }

                (rx.prescription_items || []).forEach((item: any) => {
                    if ((item.products as any)?.is_controlled) {
                        controlledSubstanceLog.push({
                            date: rx.date_dispensed || rx.date_received,
                            rx_number: rx.prescription_number,
                            patient_name: `${(rx.patient as any)?.first_name || ''} ${(rx.patient as any)?.last_name || ''}`.trim() || 'Unknown Patient',
                            prescriber: rx.prescriber_name,
                            drug_name: (item.products as any)?.name,
                            quantity: item.quantity_dispensed,
                            pharmacist: (rx.profiles as any)?.full_name || 'N/A'
                        });
                    }
                });
            });

            const pharmacistProductivity = Object.values(pharmacistStats).sort((a, b) => b.count - a.count);
            controlledSubstanceLog.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return {
                totalPending,
                totalFilled,
                totalPartial,
                pharmacistProductivity,
                controlledSubstanceLog
            };
        },
        enabled: !!dateRange.startDate && !!dateRange.endDate
    });
}

export function usePurchasesReports(dateRange: DateRange, branchId: string | null) {
    return useQuery({
        queryKey: ['reports_purchases', dateRange, branchId],
        queryFn: async () => {
            let query = supabase
                .from('purchase_orders')
                .select(`
          id, order_number, status, order_date, expected_delivery_date, total_amount,
          suppliers(name)
        `)
                .gte('order_date', dateRange.startDate)
                .lte('order_date', dateRange.endDate);

            if (branchId) {
                query = query.eq('branch_id', branchId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const totalOrders = data?.length || 0;
            let totalValue = 0;
            let pendingValue = 0;

            const ordersList: any[] = [];
            const statusCounts: Record<string, number> = {
                draft: 0, ordered: 0, partially_received: 0, received: 0, cancelled: 0
            };

            (data || []).forEach((po: any) => {
                const amount = Number(po.total_amount);
                totalValue += amount;
                if (po.status === 'ordered' || po.status === 'partially_received') {
                    pendingValue += amount;
                }

                const st = po.status || 'draft';
                statusCounts[st] = (statusCounts[st] || 0) + 1;

                ordersList.push({
                    order_number: po.order_number,
                    order_date: po.order_date,
                    expected_date: po.expected_delivery_date,
                    supplier: (po.suppliers as any)?.name || 'Unknown Supplier',
                    amount,
                    status: po.status
                });
            });

            ordersList.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

            const statusChart = Object.entries(statusCounts).map(([name, value]) => ({
                name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value
            })).filter(s => s.value > 0);

            return {
                totalOrders,
                totalValue,
                pendingValue,
                statusChart,
                ordersList
            };
        },
        enabled: !!dateRange.startDate && !!dateRange.endDate
    });
}

