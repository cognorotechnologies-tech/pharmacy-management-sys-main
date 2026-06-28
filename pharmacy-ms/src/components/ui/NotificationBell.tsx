import { useState, useRef, useEffect } from 'react';
import { Bell, Package, AlertTriangle, CheckCircle, Truck, AlertCircle, ShieldAlert, Info, Check } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/types/database';

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'low_stock': return <Package className="w-5 h-5 text-yellow-500" />;
            case 'expiry_warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
            case 'prescription_ready': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'po_delivered': return <Truck className="w-5 h-5 text-blue-500" />;
            case 'drug_interaction': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'controlled_substance': return <ShieldAlert className="w-5 h-5 text-purple-500" />;
            default: return <Info className="w-5 h-5 text-slate-500" />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        setIsOpen(false);

        // Navigate based on type
        switch (notification.type) {
            case 'low_stock':
            case 'expiry_warning':
                navigate('/inventory');
                break;
            case 'prescription_ready':
            case 'drug_interaction':
            case 'controlled_substance':
                if (notification.reference_id) {
                    navigate('/prescriptions');
                } else {
                    navigate('/prescriptions');
                }
                break;
            case 'po_delivered':
                navigate('/purchasing/orders');
                break;
            default:
                navigate('/notifications');
        }
    };

    const recentNotifications = notifications.slice(0, 5);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-slate-100 ring-1 ring-black ring-opacity-5 z-50 transform origin-top-right transition-all">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => { markAllAsRead(); setIsOpen(false); }}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">
                                No notifications yet.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {recentNotifications.map((notif) => (
                                    <li key={notif.id}
                                        className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notif.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                    {notif.title}
                                                </p>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1.5 font-medium">
                                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {!notif.read && (
                                                <div className="flex-shrink-0">
                                                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                        <button
                            onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                            className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900 py-1"
                        >
                            View All Notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
