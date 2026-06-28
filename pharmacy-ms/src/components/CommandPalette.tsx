import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Pill,
    Users,
    FileText,
    Truck,
    Command,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
    id: string;
    type: 'product' | 'patient' | 'prescription' | 'order';
    title: string;
    subtitle: string;
    href: string;
}

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();

    const results: SearchResult[] = query ? ([
        { id: '1', type: 'product', title: 'Amoxicillin 500mg', subtitle: 'Stock: 45 units', href: '/inventory' },
        { id: '2', type: 'patient', title: 'John Doe', subtitle: '0912-345-678', href: '/patients/1' },
        { id: '3', type: 'prescription', title: 'RX-5542', subtitle: 'Patient: Jane Smith', href: '/prescriptions' },
        { id: '4', type: 'order', title: 'PO-9921', subtitle: 'Supplier: PharmaCorp', href: '/purchasing/orders' },
    ] as SearchResult[]).filter(r => r.title.toLowerCase().includes(query.toLowerCase())) : [];

    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggle();
            }
            if (e.key === 'Escape') setIsOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('toggle-command-palette', toggle as any);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('toggle-command-palette', toggle as any);
        };
    }, [toggle]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleSelect = (href: string) => {
        setIsOpen(false);
        setQuery('');
        navigate(href);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex].href);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 sm:px-6">
            <div
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={() => setIsOpen(false)}
            />

            <div
                className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-black overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300"
            >
                <div className="flex items-center px-4 border-b border-slate-800">
                    <Search className="h-5 w-5 text-slate-500" />
                    <input
                        autoFocus
                        className="flex-1 px-4 py-4 bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600 text-lg"
                        placeholder="Search products, patients, orders..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400">
                        <Command size={10} />
                        K
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="space-y-1">
                            {['product', 'patient', 'prescription', 'order'].map(type => {
                                const group = results.filter(r => r.type === type);
                                if (group.length === 0) return null;

                                return (
                                    <div key={type} className="mb-4">
                                        <h3 className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                            {type}s
                                        </h3>
                                        {group.map((result) => {
                                            const absoluteIdx = results.indexOf(result);
                                            const isSelected = absoluteIdx === selectedIndex;
                                            const Icon = result.type === 'product' ? Pill :
                                                result.type === 'patient' ? Users :
                                                    result.type === 'prescription' ? FileText : Truck;

                                            return (
                                                <button
                                                    key={result.id}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 px-3 py-3 rounded-lg text-left transition-all duration-150 group",
                                                        isSelected ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "hover:bg-slate-800/50 text-slate-400"
                                                    )}
                                                    onClick={() => handleSelect(result.href)}
                                                    onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                                                >
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 transition-colors",
                                                        isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500 group-hover:bg-slate-700"
                                                    )}>
                                                        <Icon size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={cn("text-sm font-bold truncate", isSelected ? "text-white" : "text-slate-200")}>
                                                            {result.title}
                                                        </div>
                                                        <div className={cn("text-xs truncate", isSelected ? "text-white/70" : "text-slate-500")}>
                                                            {result.subtitle}
                                                        </div>
                                                    </div>
                                                    {isSelected && <ArrowRight size={16} className="text-white animate-in slide-in-from-left-2" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ) : query ? (
                        <div className="py-12 text-center">
                            <div className="inline-flex w-12 h-12 bg-slate-800 rounded-full items-center justify-center text-slate-600 mb-4">
                                <Search size={24} />
                            </div>
                            <p className="text-sm font-medium text-slate-400">No results found for "{query}"</p>
                            <p className="text-xs text-slate-600 mt-1">Try searching for something else</p>
                        </div>
                    ) : (
                        <div className="py-8 px-4">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Searches</h3>
                            <div className="space-y-2">
                                {/* Mock recent searches */}
                                <div className="flex items-center gap-3 text-xs text-slate-400 p-2 hover:bg-slate-800/50 rounded-sm cursor-pointer transition-colors">
                                    <Search size={14} className="text-slate-600" />
                                    <span>Amoxicillin</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 p-2 hover:bg-slate-800/50 rounded-sm cursor-pointer transition-colors">
                                    <Search size={14} className="text-slate-600" />
                                    <span>John Doe</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between text-[10px] font-medium text-slate-500">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">Enter</kbd>
                            Select
                        </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-slate-600">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">Esc</kbd>
                        Close
                    </span>
                </div>
            </div>
        </div>
    );
}
