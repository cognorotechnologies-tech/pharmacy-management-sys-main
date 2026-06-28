import { useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, Package, AlertTriangle, CheckCircle, Truck, AlertCircle, ShieldAlert, Info, Check, Filter, Settings } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import type { Notification, NotificationType } from '@/types/database';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

export default function NotificationCenterPage() {
    const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications();
    const navigate = useNavigate();

    const [filterStatus, setFilterStatus] = useState<'all' | 'unread'>('all');
    const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

    const filteredNotifications = useMemo(() => {
        return notifications.filter(notif => {
            const matchesStatus = filterStatus === 'all' || (filterStatus === 'unread' && !notif.read);
            const matchesType = filterType === 'all' || notif.type === filterType;
            return matchesStatus && matchesType;
        });
    }, [notifications, filterStatus, filterType]);

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

    const getTypeLabel = (type: string) => {
        return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }

        switch (notification.type) {
            case 'low_stock':
            case 'expiry_warning':
                navigate('/inventory');
                break;
            case 'prescription_ready':
            case 'drug_interaction':
            case 'controlled_substance':
                navigate('/prescriptions');
                break;
            case 'po_delivered':
                navigate('/purchasing/orders');
                break;
            default:
                break;
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Bell className="w-8 h-8 text-blue-600" />
                        Notification Center
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage and review all your system alerts and notifications.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setIsPreferencesOpen(true)}
                        className="flex items-center gap-2 bg-white"
                    >
                        <Settings className="w-4 h-4" />
                        Preferences
                    </Button>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => markAllAsRead()}
                            className="flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Mark all as read
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-64 flex-shrink-0 space-y-6">
                    <div className="bg-white p-5 rounded-sm border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
                            <Filter className="w-4 h-4 text-slate-500" /> Filters
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Status</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={filterStatus === 'all'}
                                            onChange={() => setFilterStatus('all')}
                                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        All Notifications
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={filterStatus === 'unread'}
                                            onChange={() => setFilterStatus('unread')}
                                            className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        Unread Only
                                        {unreadCount > 0 && (
                                            <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs font-medium ml-auto">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Type</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as NotificationType | 'all')}
                                >
                                    <option value="all">All Types</option>
                                    <option value="low_stock">Low Stock Alerts</option>
                                    <option value="expiry_warning">Expiry Warnings</option>
                                    <option value="prescription_ready">Prescriptions Ready</option>
                                    <option value="po_delivered">PO Delivered</option>
                                    <option value="drug_interaction">Drug Interactions</option>
                                    <option value="controlled_substance">Controlled Substances</option>
                                    <option value="system_alert">System Alerts</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-sm border border-slate-200 w-full">
                    {filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                            <Bell className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="text-lg font-medium">No notifications found.</p>
                            <p className="text-sm mt-1">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {filteredNotifications.map((notif) => (
                                <li
                                    key={notif.id}
                                    className={`p-5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-4 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="flex-shrink-0 mt-1 bg-white p-2 rounded-full shadow-sm border border-slate-100 h-10 w-10 flex items-center justify-center">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <p className={`text-base ${!notif.read ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                                                {format(new Date(notif.created_at), 'MMM d, yyyy h:mm a')}
                                            </p>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1 pr-8 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <div className="mt-2 flex items-center gap-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                                {getTypeLabel(notif.type)}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                    {!notif.read && (
                                        <div className="flex-shrink-0 flex items-center">
                                            <span className="inline-block w-2.5 h-2.5 bg-blue-600 rounded-full" title="Unread"></span>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <NotificationPreferencesModal
                isOpen={isPreferencesOpen}
                onClose={() => setIsPreferencesOpen(false)}
            />
        </div>
    );
}
