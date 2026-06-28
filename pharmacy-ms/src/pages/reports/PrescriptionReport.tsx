import React, { useEffect } from 'react';
import { usePrescriptionReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/exportUtils';
import { Loader2, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ReportProps {
    dateRange: { startDate: string; endDate: string };
    branchId: string | null;
}

export default function PrescriptionReport({ dateRange, branchId }: ReportProps) {
    const { data, isLoading, error } = usePrescriptionReports(dateRange, branchId);

    useEffect(() => {
        const handleExport = () => {
            if (data?.controlledSubstanceLog) {
                const exportData = data.controlledSubstanceLog.map((log: any) => ({
                    Date: log.date ? format(parseISO(log.date), 'MM/dd/yy HH:mm') : 'N/A',
                    Rx_Number: log.rx_number,
                    Patient_Name: log.patient_name,
                    Drug_Name: log.drug_name,
                    Quantity: log.quantity,
                    Prescriber: log.prescriber,
                    Pharmacist: log.pharmacist
                }));
                exportToCsv('Prescription_CS_Log', exportData);
            }
        };
        window.addEventListener('export-csv-prescriptions', handleExport as EventListener);
        return () => window.removeEventListener('export-csv-prescriptions', handleExport as EventListener);
    }, [data]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center text-red-500 py-10">
                Failed to load prescription report data.
            </div>
        );
    }

    const {
        totalPending, totalFilled, totalPartial,
        pharmacistProductivity, controlledSubstanceLog
    } = data;

    const totalProcessed = totalFilled + totalPartial;



    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CheckCircle className="w-16 h-16 text-emerald-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Filled Prescriptions</p>
                    <p className="text-4xl font-bold text-slate-900">{totalFilled}</p>
                    <p className="text-sm text-slate-500 mt-2">Fully dispensed in period</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AlertTriangle className="w-16 h-16 text-orange-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Partially Filled</p>
                    <p className="text-4xl font-bold text-slate-900">{totalPartial}</p>
                    <p className="text-sm text-slate-500 mt-2">Awaiting remaining stock</p>
                </div>

                <div className="bg-slate-900 p-6 border border-slate-800 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock className="w-16 h-16 text-blue-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Pending Queue</p>
                    <p className="text-4xl font-bold text-blue-400">{totalPending}</p>
                    <p className="text-sm text-slate-400 mt-2">Requires pharmacist review</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <FileText className="w-16 h-16 text-indigo-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Total Processed</p>
                    <p className="text-4xl font-bold text-slate-900">{totalProcessed}</p>
                    <p className="text-sm text-slate-500 mt-2">Total activity (Filled + Partial)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pharmacist Productivity */}
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden h-fit">
                    <div className="p-5 border-b border-slate-200 bg-slate-50">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Pharmacist Output</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pharmacist</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispensed</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {pharmacistProductivity.map((p: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{p.name || 'Unknown'}</td>
                                        <td className="px-6 py-3 text-sm text-slate-900 font-bold text-right">{p.count}</td>
                                    </tr>
                                ))}
                                {pharmacistProductivity.length === 0 && (
                                    <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-500">No dispensing activity recorded.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Controlled Substances Log */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Controlled Substances Log</h3>
                            <p className="text-xs text-slate-500 mt-1">Regulatory record of Schedule II+ dispensations</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-900 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Rx #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Patient</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Drug</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Prescriber</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider bg-slate-800">Dispensed By</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200/60">
                                {controlledSubstanceLog.map((log: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50 font-mono text-sm">
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                                            {log.date ? format(parseISO(log.date), 'MM/dd/yy HH:mm') : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-900">{log.rx_number}</td>
                                        <td className="px-4 py-3 text-slate-800">{log.patient_name}</td>
                                        <td className="px-4 py-3 text-red-600 font-medium">{log.drug_name}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-900">{log.quantity}</td>
                                        <td className="px-4 py-3 text-slate-600">Dr. {log.prescriber}</td>
                                        <td className="px-4 py-3 bg-slate-50 text-slate-700 font-semibold">{log.pharmacist}</td>
                                    </tr>
                                ))}
                                {controlledSubstanceLog.length === 0 && (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-sans">No controlled substances dispensed in this period.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
}
