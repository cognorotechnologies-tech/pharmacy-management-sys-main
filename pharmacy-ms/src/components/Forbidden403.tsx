import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Forbidden403() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
            <ShieldX className="mb-6 h-16 w-16 text-red-400" strokeWidth={1.5} />

            <h1 className="mb-2 text-2xl font-bold text-slate-900">
                Access Denied
            </h1>

            <p className="mb-8 max-w-md text-slate-500">
                You don't have permission to view this page. Contact your administrator
                if you believe this is a mistake.
            </p>

            <button
                onClick={() => navigate(-1)}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Go Back
            </button>
        </div>
    );
}
