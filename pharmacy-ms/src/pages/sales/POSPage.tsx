import {
    useState, useEffect, useReducer, useRef, useMemo, useCallback,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    Search, ShoppingCart, X, Plus, Minus, Trash2, User, CreditCard,
    DollarSign, Banknote, Shield, Receipt, Loader2, AlertTriangle,
    Keyboard, FileText, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
    usePOSProductSearch, usePatientSearchPOS, usePatientPrescriptions,
    usePatientInsurance, useCheckoutSale, generateSaleNumber,
    type POSProduct, type POSPatient, type POSPrescription, type CheckoutInput,
} from '@/hooks/useSales';
import { useActiveShift } from '@/hooks/useShifts';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ReceiptModal } from './ReceiptModal';
import POSHistoryTab from './POSHistoryTab';
import { ShiftSidebar } from './ShiftSidebar';
import { Clock } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Constants & Types
   ═══════════════════════════════════════════════════════════════ */

const TAX_RATE = 0.05;
const ADMIN_DISCOUNT_THRESHOLD = 20; // % — above this needs override

interface CartItem {
    id: string; // `${product_id}_${batch_id}`
    product_id: string;
    name: string;
    strength: string | null;
    unit: string;
    batch_id: string | null;
    batch_expiry: string | null;
    quantity: number;
    unit_price: number;
    discount: number; // per item discount amount
    requires_prescription: boolean;
    is_controlled: boolean;
    max_stock: number;
}

type CartAction =
    | { type: 'ADD'; item: CartItem }
    | { type: 'REMOVE'; id: string }
    | { type: 'SET_QTY'; id: string; qty: number }
    | { type: 'SET_DISCOUNT'; id: string; discount: number }
    | { type: 'CLEAR' }
    | { type: 'RESTORE'; items: CartItem[] };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
    switch (action.type) {
        case 'ADD': {
            const existing = state.find((i) => i.id === action.item.id);
            if (existing) {
                const newQty = Math.min(existing.quantity + 1, existing.max_stock);
                return state.map((i) => i.id === action.item.id ? { ...i, quantity: newQty } : i);
            }
            return [...state, action.item];
        }
        case 'REMOVE':
            return state.filter((i) => i.id !== action.id);
        case 'SET_QTY':
            return state.map((i) => i.id === action.id
                ? { ...i, quantity: Math.max(1, Math.min(action.qty, i.max_stock)) }
                : i
            );
        case 'SET_DISCOUNT':
            return state.map((i) => i.id === action.id ? { ...i, discount: Math.max(0, action.discount) } : i);
        case 'CLEAR':
            return [];
        case 'RESTORE':
            return action.items;
        default:
            return state;
    }
}

/* ═══════════════════════════════════════════════════════════════
   POS Page
   ═══════════════════════════════════════════════════════════════ */

type POSTab = 'sale' | 'history';

export default function POSPage() {
    const navigate = useNavigate();
    const { user, branchId } = useAuth();

    // ─── Cart State ──────────────────────────────────────────
    const storageKey = `pos_cart_${branchId}`;
    const [cart, dispatch] = useReducer(cartReducer, [], () => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(cart));
    }, [cart, storageKey]);

    // ─── Shift State ──────────────────────────────────────────
    const { data: activeShift } = useActiveShift(user?.id, branchId || undefined);
    const [showShiftSidebar, setShowShiftSidebar] = useState(false);

    // ─── Tab ─────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<POSTab>('sale');

    // ─── Product Search ──────────────────────────────────────
    const searchRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { data: searchResults = [], isLoading: searching } = usePOSProductSearch(searchQuery, branchId || '');

    // ─── Barcode Scanner ─────────────────────────────────────
    const barcodeBuffer = useRef('');
    const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleBarcodeDetected = useCallback(async (barcode: string) => {
        const { data } = await supabase
            .from('products')
            .select('id, name, generic_name, barcode, strength, unit, requires_prescription, is_controlled, category')
            .eq('barcode', barcode)
            .eq('is_active', true)
            .single();

        if (!data || !branchId) return;

        const [invRes, batchRes] = await Promise.all([
            supabase
                .from('inventory')
                .select('quantity_on_hand')
                .eq('product_id', data.id)
                .eq('branch_id', branchId)
                .single(),
            supabase
                .from('batches')
                .select('id, selling_price, expiry_date, quantity_remaining')
                .eq('product_id', data.id)
                .eq('is_active', true)
                .gt('quantity_remaining', 0)
                .order('expiry_date', { ascending: true })
                .limit(1),
        ]);

        const stock = invRes.data?.quantity_on_hand ?? 0;
        const batch = batchRes.data?.[0];

        if (stock <= 0) {
            toast.error(`${data.name} is out of stock`);
            return;
        }

        addToCart({
            id: data.id,
            name: data.name,
            generic_name: data.generic_name,
            barcode: data.barcode,
            strength: data.strength,
            unit: data.unit,
            requires_prescription: data.requires_prescription,
            is_controlled: data.is_controlled,
            category: data.category,
            stock,
            price: batch?.selling_price ?? 0,
            batch_id: batch?.id ?? null,
            batch_expiry: batch?.expiry_date ?? null,
        });

        toast.success(`Scanned: ${data.name}`, { duration: 1500 });
    }, [branchId]);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            // Ignore if typing in an input
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const char = e.key;
            if (char.length === 1 && /[a-zA-Z0-9]/.test(char)) {
                barcodeBuffer.current += char;
                if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
                barcodeTimer.current = setTimeout(() => {
                    if (barcodeBuffer.current.length >= 6) {
                        handleBarcodeDetected(barcodeBuffer.current);
                    }
                    barcodeBuffer.current = '';
                }, 100);
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleBarcodeDetected]);

    // ─── Patient ─────────────────────────────────────────────
    const [patientQuery, setPatientQuery] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<POSPatient | null>(null);
    const [showPatientResults, setShowPatientResults] = useState(false);
    const { data: patientResults = [] } = usePatientSearchPOS(patientQuery);
    const { data: patientRxList = [] } = usePatientPrescriptions(selectedPatient?.id ?? null);
    const { data: insurance } = usePatientInsurance(selectedPatient?.id ?? null);

    // ─── Payment ─────────────────────────────────────────────
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'insurance' | 'split'>('cash');
    const [amountTendered, setAmountTendered] = useState('');
    const [cartDiscount, setCartDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [linkedRxId, setLinkedRxId] = useState<string | null>(null);
    const [splitAmounts, setSplitAmounts] = useState({ method1: 'cash' as string, amount1: '', method2: 'card' as string, amount2: '' });
    const [showAdminOverride, setShowAdminOverride] = useState(false);
    const [adminPin, setAdminPin] = useState('');
    const [selectedRow, setSelectedRow] = useState<number>(0);

    // ─── Checkout ────────────────────────────────────────────
    const checkout = useCheckoutSale();
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSaleId, setLastSaleId] = useState<string | null>(null);

    // ─── Totals ──────────────────────────────────────────────
    const totals = useMemo(() => {
        const subtotal = cart.reduce((sum, i) => sum + (i.unit_price * i.quantity - i.discount), 0);
        const discountAmt = discountType === 'percent'
            ? subtotal * (cartDiscount / 100)
            : Math.min(cartDiscount, subtotal);
        const afterDiscount = subtotal - discountAmt;
        const tax = afterDiscount * TAX_RATE;
        const insuranceAmt = (paymentMethod === 'insurance' || paymentMethod === 'split') && insurance
            ? afterDiscount * (insurance.coverage_percentage / 100)
            : 0;
        const total = afterDiscount + tax - insuranceAmt;
        const tendered = parseFloat(amountTendered) || 0;
        const change = tendered - total;
        return { subtotal, discountAmt, tax, insuranceAmt, total, tendered, change };
    }, [cart, cartDiscount, discountType, insurance, paymentMethod, amountTendered]);

    // ─── Add to Cart helper ──────────────────────────────────
    const addToCart = useCallback((p: POSProduct) => {
        if (p.stock <= 0) {
            toast.error(`${p.name} is out of stock`);
            return;
        }
        dispatch({
            type: 'ADD',
            item: {
                id: `${p.id}_${p.batch_id || 'nobatch'}`,
                product_id: p.id,
                name: p.name,
                strength: p.strength,
                unit: p.unit,
                batch_id: p.batch_id,
                batch_expiry: p.batch_expiry,
                quantity: 1,
                unit_price: p.price,
                discount: 0,
                requires_prescription: p.requires_prescription,
                is_controlled: p.is_controlled,
                max_stock: p.stock,
            },
        });
        setSearchQuery('');
        setShowResults(false);
        searchRef.current?.focus();
    }, []);

    // ─── Load Rx items into cart ─────────────────────────────
    const loadPrescription = useCallback((rx: POSPrescription) => {
        setLinkedRxId(rx.id);
        rx.items.forEach(async (item) => {
            const remaining = item.quantity_prescribed - item.quantity_dispensed;
            if (remaining <= 0) return;

            const { data: batchRes } = await supabase
                .from('batches')
                .select('id, selling_price, expiry_date, quantity_remaining')
                .eq('product_id', item.product_id)
                .eq('is_active', true)
                .gt('quantity_remaining', 0)
                .order('expiry_date', { ascending: true })
                .limit(1);

            const batch = batchRes?.[0];
            dispatch({
                type: 'ADD',
                item: {
                    id: `${item.product_id}_${batch?.id || 'nobatch'}`,
                    product_id: item.product_id,
                    name: item.product_name,
                    strength: null,
                    unit: 'units',
                    batch_id: batch?.id ?? null,
                    batch_expiry: batch?.expiry_date ?? null,
                    quantity: Math.min(remaining, batch?.quantity_remaining ?? remaining),
                    unit_price: batch?.selling_price ?? 0,
                    discount: 0,
                    requires_prescription: true,
                    is_controlled: false,
                    max_stock: batch?.quantity_remaining ?? remaining,
                },
            });
        });
        toast.success(`Loaded Rx #${rx.prescription_number}`);
    }, []);

    // ─── Checkout handler ────────────────────────────────────
    const handleCheckout = useCallback(async () => {
        if (cart.length === 0) return;

        // Check if Rx-required items need a patient
        const rxItems = cart.filter((i) => i.requires_prescription);
        if (rxItems.length > 0 && !selectedPatient) {
            toast.error('Patient required for prescription items');
            return;
        }

        // Check discount override
        if (discountType === 'percent' && cartDiscount > ADMIN_DISCOUNT_THRESHOLD) {
            setShowAdminOverride(true);
            return;
        }

        const input: CheckoutInput = {
            sale_number: generateSaleNumber(),
            branch_id: branchId!,
            cashier_id: user!.id,
            patient_id: selectedPatient?.id || null,
            prescription_id: linkedRxId,
            shift_id: activeShift?.id || null,
            payment_method: paymentMethod === 'split' ? 'cash' : paymentMethod,
            subtotal: totals.subtotal,
            tax_amount: totals.tax,
            discount_amount: totals.discountAmt,
            insurance_amount: totals.insuranceAmt,
            total_amount: totals.total,
            amount_paid: paymentMethod === 'cash' ? totals.tendered : totals.total,
            change_amount: paymentMethod === 'cash' ? Math.max(0, totals.change) : 0,
            items: cart.map((i) => ({
                product_id: i.product_id,
                batch_id: i.batch_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
                discount: i.discount,
                tax: (i.unit_price * i.quantity - i.discount) * TAX_RATE,
                total_price: i.unit_price * i.quantity - i.discount,
            })),
        };

        try {
            const result = await checkout.mutateAsync(input);
            setLastSaleId(result.sale_id);
            setShowReceipt(true);
            dispatch({ type: 'CLEAR' });
            setSelectedPatient(null);
            setLinkedRxId(null);
            setAmountTendered('');
            setCartDiscount(0);
            setPaymentMethod('cash');
            toast.success('Sale completed!');
        } catch (err) {
            toast.error(`Checkout failed: ${(err as Error).message}`);
        }
    }, [cart, selectedPatient, linkedRxId, paymentMethod, totals, branchId, user, checkout, cartDiscount, discountType]);

    // ─── Global Keyboard Shortcuts ───────────────────────────
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                navigate(-1);
                return;
            }
            if (e.key === 'F1') {
                e.preventDefault();
                dispatch({ type: 'CLEAR' });
                setSelectedPatient(null);
                setLinkedRxId(null);
                setAmountTendered('');
                setCartDiscount(0);
                searchRef.current?.focus();
                toast('New Sale', { icon: '🆕' });
                return;
            }
            if (e.key === 'F2') {
                e.preventDefault();
                searchRef.current?.focus();
                return;
            }
            if (e.key === 'F10') {
                e.preventDefault();
                handleCheckout();
                return;
            }
            if (e.key === 'Delete' && cart.length > 0) {
                const tag = (e.target as HTMLElement)?.tagName;
                if (tag === 'INPUT') return;
                const item = cart[selectedRow];
                if (item) {
                    dispatch({ type: 'REMOVE', id: item.id });
                    setSelectedRow(Math.max(0, selectedRow - 1));
                }
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [navigate, handleCheckout, cart, selectedRow]);

    // ─── Search keyboard navigation ──────────────────────────
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
            e.preventDefault();
            addToCart(searchResults[selectedIndex]);
        }
    };

    // ─── Stock color ─────────────────────────────────────────
    const stockColor = (stock: number) => {
        if (stock <= 0) return 'text-red-400';
        if (stock <= 10) return 'text-amber-400';
        return 'text-emerald-400';
    };

    /* ═══════════════════════════════════════════════════════════
       HISTORY TAB
       ═══════════════════════════════════════════════════════════ */
    if (activeTab === 'history') {
        return (
            <div className="fixed inset-0 z-50 bg-gray-950 text-white flex flex-col">
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveTab('sale')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
                            <ArrowRight className="w-4 h-4 rotate-180" /> Back to POS
                        </button>
                        <span className="text-sm font-semibold text-emerald-400">Sale History / Void</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <Keyboard className="w-3.5 h-3.5" /> <span>Esc = Exit</span>
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    <POSHistoryTab branchId={branchId || ''} userId={user?.id || ''} />
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════════
       MAIN POS RENDER
       ═══════════════════════════════════════════════════════════ */
    const canCheckout = cart.length > 0
        && (paymentMethod !== 'cash' || totals.tendered >= totals.total)
        && !checkout.isPending;

    return (
        <div className="fixed inset-0 z-50 bg-gray-950 text-white flex flex-col">
            {/* ─── Top Bar ──────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold tracking-tight">
                        <span className="text-emerald-400">⚡</span> PharmaCare POS
                    </h1>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('sale')}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'sale' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            New Sale
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${(activeTab as string) === 'history' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            History
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3 mr-4">
                    <button
                        onClick={() => setShowShiftSidebar(!showShiftSidebar)}
                        className={`p-2 rounded-full transition-all flex items-center gap-2 px-4 ${showShiftSidebar
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        title="Shift Summary"
                    >
                        <Clock size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Shift</span>
                    </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" /> F1=New</span>
                    <span>F2=Search</span>
                    <span>F10=Checkout</span>
                    <span>Esc=Exit</span>
                    <span>Del=Remove</span>
                </div>
            </div>

            {/* ─── Main Content — Split ─────────────────────── */}
            <div className="flex flex-1 min-h-0 relative">
                {/* Shift Sidebar (Overlay) */}
                {showShiftSidebar && activeShift && (
                    <div className="absolute right-0 top-0 bottom-0 z-30 animate-in slide-in-from-right duration-300">
                        <div className="h-full flex">
                            <button
                                onClick={() => setShowShiftSidebar(false)}
                                className="flex-1 bg-black/40 backdrop-blur-sm cursor-default"
                            />
                            <ShiftSidebar
                                shiftId={activeShift.id}
                                onShiftEnded={() => {
                                    setShowShiftSidebar(false);
                                    navigate('/sales'); // Refresh or go back
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ═══════ LEFT 60% — Search + Cart ═══════ */}
                <div className="w-[60%] flex flex-col border-r border-gray-800">

                    {/* Search */}
                    <div className="relative p-3 border-b border-gray-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Search products — name, barcode, generic... (F2)"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); setSelectedIndex(0); }}
                                onFocus={() => setShowResults(true)}
                                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                onKeyDown={handleSearchKeyDown}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                autoFocus
                            />
                            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />}
                        </div>

                        {/* Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute left-3 right-3 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-20 max-h-72 overflow-y-auto">
                                {searchResults.map((p, idx) => (
                                    <button
                                        key={p.id}
                                        className={`w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-gray-700/60 transition-colors ${idx === selectedIndex ? 'bg-gray-700/80 ring-1 ring-emerald-500/50' : ''}`}
                                        onMouseDown={() => addToCart(p)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">{p.name}</span>
                                                {p.strength && <span className="text-xs text-gray-400">{p.strength}</span>}
                                                {p.requires_prescription && <Badge variant="amber">Rx</Badge>}
                                                {p.is_controlled && <Badge variant="red">CII</Badge>}
                                            </div>
                                            {p.generic_name && <p className="text-xs text-gray-500 truncate">{p.generic_name}</p>}
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0 ml-3">
                                            <span className={`text-xs font-mono ${stockColor(p.stock)}`}>
                                                {p.stock} {p.unit}
                                            </span>
                                            <span className="text-sm font-semibold text-emerald-400">
                                                ${p.price.toFixed(2)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart */}
                    <div className="flex-1 overflow-auto">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                <ShoppingCart className="w-16 h-16 mb-3 opacity-30" />
                                <p className="text-sm">Cart is empty</p>
                                <p className="text-xs text-gray-700 mt-1">Search products or scan a barcode to start</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-900/50 sticky top-0">
                                    <tr className="text-gray-400 text-xs uppercase">
                                        <th className="text-left pl-4 py-2 w-8">#</th>
                                        <th className="text-left py-2">Product</th>
                                        <th className="text-center py-2 w-24">Qty</th>
                                        <th className="text-right py-2 w-24">Price</th>
                                        <th className="text-right py-2 w-24">Discount</th>
                                        <th className="text-right py-2 w-28">Total</th>
                                        <th className="py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => {
                                        const lineTotal = item.unit_price * item.quantity - item.discount;
                                        return (
                                            <tr
                                                key={item.id}
                                                className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors ${idx === selectedRow ? 'bg-emerald-900/20 ring-1 ring-inset ring-emerald-500/30' : ''}`}
                                                onClick={() => setSelectedRow(idx)}
                                            >
                                                <td className="pl-4 py-2 text-gray-500">{idx + 1}</td>
                                                <td className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{item.name}</span>
                                                        {item.strength && <span className="text-xs text-gray-500">{item.strength}</span>}
                                                        {item.requires_prescription && <Badge variant="amber">Rx</Badge>}
                                                    </div>
                                                </td>
                                                <td className="py-2">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_QTY', id: item.id, qty: item.quantity - 1 }); }} className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => dispatch({ type: 'SET_QTY', id: item.id, qty: parseInt(e.target.value) || 1 })}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-12 text-center bg-gray-800 border border-gray-700 rounded text-sm py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            min={1}
                                                            max={item.max_stock}
                                                        />
                                                        <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_QTY', id: item.id, qty: item.quantity + 1 }); }} className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                                                    </div>
                                                </td>
                                                <td className="text-right py-2 text-gray-300">${item.unit_price.toFixed(2)}</td>
                                                <td className="text-right py-2">
                                                    <input
                                                        type="number"
                                                        value={item.discount || ''}
                                                        onChange={(e) => dispatch({ type: 'SET_DISCOUNT', id: item.id, discount: parseFloat(e.target.value) || 0 })}
                                                        onClick={(e) => e.stopPropagation()}
                                                        placeholder="0.00"
                                                        className="w-20 text-right bg-gray-800 border border-gray-700 rounded text-sm py-0.5 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </td>
                                                <td className="text-right py-2 font-semibold text-emerald-400">${lineTotal.toFixed(2)}</td>
                                                <td className="py-2 pr-2">
                                                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE', id: item.id }); }} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Cart Summary Bar */}
                    <div className="border-t border-gray-800 bg-gray-900/50 px-4 py-3 shrink-0">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Subtotal</span>
                                <p className="font-semibold">${totals.subtotal.toFixed(2)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Discount</span>
                                <p className="font-semibold text-amber-400">-${totals.discountAmt.toFixed(2)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                                <p className="font-semibold">${totals.tax.toFixed(2)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Total</span>
                                <p className="font-bold text-lg text-emerald-400">${totals.total.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════ RIGHT 40% — Payment Panel ═══════ */}
                <div className="w-[40%] flex flex-col bg-gray-900/30 overflow-y-auto">

                    {/* Patient Selector */}
                    <div className="p-3 border-b border-gray-800">
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <User className="w-3 h-3" /> Patient (optional)
                        </label>
                        {selectedPatient ? (
                            <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                                <div>
                                    <span className="font-medium text-sm">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                                    {selectedPatient.allergies.length > 0 && (
                                        <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Allergies: {selectedPatient.allergies.join(', ')}
                                        </p>
                                    )}
                                </div>
                                <button onClick={() => { setSelectedPatient(null); setPatientQuery(''); setLinkedRxId(null); }} className="text-gray-500 hover:text-red-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search patient..."
                                    value={patientQuery}
                                    onChange={(e) => { setPatientQuery(e.target.value); setShowPatientResults(true); }}
                                    onFocus={() => setShowPatientResults(true)}
                                    onBlur={() => setTimeout(() => setShowPatientResults(false), 200)}
                                    className="w-full pl-3 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                                {showPatientResults && patientResults.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                                        {patientResults.map((p) => (
                                            <button key={p.id} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors" onMouseDown={() => { setSelectedPatient(p); setPatientQuery(''); setShowPatientResults(false); }}>
                                                {p.first_name} {p.last_name} <span className="text-gray-500">• {p.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Active Prescriptions (if patient) */}
                    {selectedPatient && patientRxList.length > 0 && (
                        <div className="p-3 border-b border-gray-800">
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Active Prescriptions
                            </label>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {patientRxList.map((rx) => (
                                    <button
                                        key={rx.id}
                                        onClick={() => loadPrescription(rx)}
                                        className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${linkedRxId === rx.id
                                            ? 'bg-emerald-900/40 ring-1 ring-emerald-500'
                                            : 'bg-gray-800 hover:bg-gray-700'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Rx# {rx.prescription_number}</span>
                                            <Badge variant={rx.status === 'verified' ? 'green' : 'amber'}>{rx.status}</Badge>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">{rx.items.length} items • Dr. {rx.prescriber_name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Insurance */}
                    {selectedPatient && insurance && (
                        <div className="p-3 border-b border-gray-800">
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Insurance
                            </label>
                            <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg px-3 py-2 text-sm">
                                <p className="font-medium text-blue-300">{insurance.plan_name}</p>
                                <p className="text-xs text-blue-400 mt-0.5">{insurance.provider_name} • {insurance.coverage_percentage}% coverage</p>
                                {totals.insuranceAmt > 0 && (
                                    <div className="mt-2 flex justify-between text-xs">
                                        <span className="text-blue-400">Insurance pays:</span>
                                        <span className="font-bold text-blue-300">${totals.insuranceAmt.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Method */}
                    <div className="p-3 border-b border-gray-800">
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Payment Method</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {([
                                { key: 'cash', icon: Banknote, label: 'Cash' },
                                { key: 'card', icon: CreditCard, label: 'Card' },
                                { key: 'insurance', icon: Shield, label: 'Insurance' },
                                { key: 'split', icon: DollarSign, label: 'Split' },
                            ] as const).map(({ key, icon: Icon, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setPaymentMethod(key)}
                                    disabled={key === 'insurance' && !insurance}
                                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs transition-all ${paymentMethod === key
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}
                                        ${key === 'insurance' && !insurance ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cash — Tendered + Change */}
                    {paymentMethod === 'cash' && (
                        <div className="p-3 border-b border-gray-800">
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Amount Tendered</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="number"
                                    value={amountTendered}
                                    onChange={(e) => setAmountTendered(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-9 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                            {totals.tendered > 0 && (
                                <div className={`mt-2 text-center py-3 rounded-lg ${totals.change >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                                    <span className="text-xs uppercase text-gray-400">Change</span>
                                    <p className={`text-3xl font-bold font-mono ${totals.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        ${totals.change.toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Split Payment */}
                    {paymentMethod === 'split' && (
                        <div className="p-3 border-b border-gray-800 space-y-2">
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Split Payment</label>
                            {[1, 2].map((n) => {
                                const methodKey = `method${n}` as 'method1' | 'method2';
                                const amountKey = `amount${n}` as 'amount1' | 'amount2';
                                return (
                                    <div key={n} className="flex gap-2">
                                        <select
                                            value={splitAmounts[methodKey]}
                                            onChange={(e) => setSplitAmounts({ ...splitAmounts, [methodKey]: e.target.value })}
                                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm flex-shrink-0"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="card">Card</option>
                                            {insurance && <option value="insurance">Insurance</option>}
                                        </select>
                                        <div className="relative flex-1">
                                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                                            <input
                                                type="number"
                                                value={splitAmounts[amountKey]}
                                                onChange={(e) => setSplitAmounts({ ...splitAmounts, [amountKey]: e.target.value })}
                                                placeholder="0.00"
                                                className="w-full pl-7 pr-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Cart-level Discount */}
                    <div className="p-3 border-b border-gray-800">
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Cart Discount</label>
                        <div className="flex gap-2">
                            <select
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
                            >
                                <option value="percent">%</option>
                                <option value="fixed">$</option>
                            </select>
                            <input
                                type="number"
                                value={cartDiscount || ''}
                                onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                        {discountType === 'percent' && cartDiscount > ADMIN_DISCOUNT_THRESHOLD && (
                            <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Discount {'>'}{ADMIN_DISCOUNT_THRESHOLD}% requires admin override
                            </p>
                        )}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Grand Total + Checkout */}
                    <div className="p-3 bg-gray-900 border-t border-gray-800 shrink-0">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-400">Grand Total</span>
                            <span className="text-3xl font-bold text-emerald-400 font-mono">${totals.total.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={!canCheckout}
                            className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${canCheckout
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-[0.98]'
                                : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                        >
                            {checkout.isPending ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                            ) : (
                                <><Receipt className="w-5 h-5" /> Checkout (F10)</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Admin Override Modal ────────────────────── */}
            <Modal open={showAdminOverride} onClose={() => { setShowAdminOverride(false); setAdminPin(''); }} title="Admin Override Required">
                <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                        Discount of <span className="text-amber-400 font-bold">{cartDiscount}%</span> exceeds the {ADMIN_DISCOUNT_THRESHOLD}% threshold. Enter admin PIN to proceed.
                    </p>
                    <input
                        type="password"
                        placeholder="Admin PIN"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/50"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button onClick={() => { setShowAdminOverride(false); setAdminPin(''); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button>
                        <button
                            onClick={() => {
                                // For now accept any 4+ digit PIN (in production, verify against admin table)
                                if (adminPin.length >= 4) {
                                    setShowAdminOverride(false);
                                    setAdminPin('');
                                    handleCheckout();
                                } else {
                                    toast.error('PIN must be at least 4 digits');
                                }
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold"
                        >
                            Authorize
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ─── Receipt Modal ──────────────────────────── */}
            {showReceipt && lastSaleId && (
                <ReceiptModal
                    saleId={lastSaleId}
                    onClose={() => {
                        setShowReceipt(false);
                        setLastSaleId(null);
                        searchRef.current?.focus();
                    }}
                />
            )}
        </div>
    );
}
