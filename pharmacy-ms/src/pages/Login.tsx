import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { Pill, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Validation ───────────────────────────────────────────── */

const loginSchema = z.object({
    email: z.email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/* ─── Page ─────────────────────────────────────────────────── */

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn } = useAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '', rememberMe: false },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsSubmitting(true);
        const { error } = await signIn(data.email, data.password);
        setIsSubmitting(false);

        if (error) {
            toast.error(error.message || 'Invalid email or password');
            return;
        }

        toast.success('Welcome back!');
        navigate(from, { replace: true });
    };

    return (
        <div className="flex min-h-screen">
            {/* ── Left panel: branding ────────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white px-16">
                <div className="flex items-center gap-4 mb-8">
                    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                        <Pill className="h-10 w-10" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">PharmaCare</h1>
                        <p className="text-blue-200 text-sm font-medium">Management System</p>
                    </div>
                </div>

                <p className="max-w-md text-center text-blue-100 text-lg leading-relaxed">
                    Streamline your pharmacy operations with intelligent inventory
                    management, prescription tracking, and real-time analytics.
                </p>

                <div className="mt-12 grid grid-cols-3 gap-6 text-center">
                    {[
                        { value: '20+', label: 'Products' },
                        { value: '24/7', label: 'Monitoring' },
                        { value: '99.9%', label: 'Uptime' },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                            <p className="text-xl font-bold">{stat.value}</p>
                            <p className="text-xs text-blue-200">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right panel: login form ────────────────────────── */}
            <div className="flex w-full flex-col justify-center px-8 sm:px-16 lg:w-1/2 bg-slate-50">
                {/* Mobile branding */}
                <div className="mb-8 flex items-center gap-3 lg:hidden">
                    <div className="rounded-xl bg-blue-600 p-2.5">
                        <Pill className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900">PharmaCare</span>
                </div>

                <div className="mx-auto w-full max-w-sm">
                    <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Sign in to your pharmacy account
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@pharmacy.com"
                                {...register('email')}
                                className={`mt-1.5 block w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email
                                        ? 'border-red-300 focus:ring-red-500'
                                        : 'border-slate-300'
                                    }`}
                            />
                            {errors.email && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                    <AlertCircle className="h-3 w-3" />
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <div className="relative mt-1.5">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    {...register('password')}
                                    className={`block w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-slate-300'
                                        }`}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                    <AlertCircle className="h-3 w-3" />
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Remember me */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...register('rememberMe')}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Remember me
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-400">
                        PharmaCare Management System v1.0
                    </p>
                </div>
            </div>
        </div>
    );
}
