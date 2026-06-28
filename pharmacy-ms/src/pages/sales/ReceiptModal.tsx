import React, { useMemo, useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import {
    Printer,
    Download,
    X,
    CheckCircle2,
} from 'lucide-react';
import { useSaleDetail } from '@/hooks/useSales';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════
   Receipt Modal — Enhanced jsPDF receipt with QR & Rx details
   ═══════════════════════════════════════════════════════════════ */

interface ReceiptModalProps {
    saleId: string | null;
    onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ saleId, onClose }) => {
    const { data: sale, isLoading } = useSaleDetail(saleId);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    // Generate QR Code
    useEffect(() => {
        if (saleId) {
            QRCode.toDataURL(`receipt:${saleId}`, {
                margin: 1,
                width: 100,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                }
            }).then(setQrDataUrl).catch(console.error);
        }
    }, [saleId]);

    const receiptPDF = useMemo(() => {
        if (!sale) return null;

        // 80mm roll paper (standard thermal)
        const doc = new jsPDF({ unit: 'mm', format: [80, 250] });
        let y = 10;
        const lm = 5;
        const pw = 70;

        // --- Header ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('PHARMACARE', 40, y, { align: 'center' });
        y += 5;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('123 Health Ave, Medical District', 40, y, { align: 'center' });
        y += 3;
        doc.text('Tel: +1 (555) 012-3456 | TIN: 987-654-321', 40, y, { align: 'center' });
        y += 5;

        // Divider
        doc.setDrawColor(200);
        doc.line(lm, y, lm + pw, y);
        y += 4;

        // Sale Info
        doc.setFont('helvetica', 'bold');
        doc.text(`Receipt #: ${sale.sale_number}`, lm, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')}`, lm, y);
        y += 4;
        doc.text(`Cashier: ${sale.cashier_name || 'System'}`, lm, y);
        y += 4;

        if (sale.patient_name) {
            doc.text(`Patient: ${sale.patient_name}`, lm, y);
            y += 4;
        }

        // Rx Details (if applicable)
        if (sale.prescription_number) {
            y += 2;
            doc.setFont('helvetica', 'bold');
            doc.text(`Rx: ${sale.prescription_number}`, lm, y);
            y += 4;
            doc.setFont('helvetica', 'normal');
            doc.text(`Dr: ${sale.prescriber_name || 'N/A'}`, lm, y);
            y += 4;
        }

        y += 2;
        doc.line(lm, y, lm + pw, y);
        y += 5;

        // --- Items Table ---
        doc.setFont('helvetica', 'bold');
        doc.text('Item', lm, y);
        doc.text('Qty', lm + 38, y);
        doc.text('Price', lm + 48, y);
        doc.text('Total', lm + pw, y, { align: 'right' });
        y += 1.5;
        doc.line(lm, y, lm + pw, y);
        y += 4;

        doc.setFont('helvetica', 'normal');
        sale.items.forEach((item) => {
            const name = item.product_name.length > 25
                ? item.product_name.substring(0, 22) + '...'
                : item.product_name;

            doc.text(name, lm, y);
            doc.text(String(item.quantity), lm + 38, y);
            doc.text(item.unit_price.toFixed(2), lm + 48, y);
            doc.text(item.total_price.toFixed(2), lm + pw, y, { align: 'right' });
            y += 4;

            if (item.discount > 0) {
                doc.setFontSize(6);
                doc.setTextColor(100);
                doc.text(`  Disc: -$${item.discount.toFixed(2)}`, lm, y);
                doc.setTextColor(0);
                doc.setFontSize(7);
                y += 3.5;
            }
        });

        y += 2;
        doc.line(lm, y, lm + pw, y);
        y += 5;

        // --- Totals ---
        const drawTotal = (label: string, value: string, isBold = false) => {
            if (isBold) doc.setFont('helvetica', 'bold');
            doc.text(label, lm + 35, y);
            doc.text(value, lm + pw, y, { align: 'right' });
            if (isBold) doc.setFont('helvetica', 'normal');
            y += 4.5;
        };

        drawTotal('Subtotal:', `$${sale.subtotal.toFixed(2)}`);
        if (sale.discount_amount > 0) drawTotal('Discount:', `-$${sale.discount_amount.toFixed(2)}`);
        drawTotal('Tax:', `$${sale.tax_amount.toFixed(2)}`);
        if (sale.insurance_amount > 0) drawTotal('Insurance:', `-$${sale.insurance_amount.toFixed(2)}`);

        y += 1;
        doc.setLineWidth(0.5);
        doc.line(lm + 35, y, lm + pw, y);
        y += 5;

        doc.setFontSize(9);
        drawTotal('TOTAL:', `$${sale.total_amount.toFixed(2)}`, true);
        doc.setFontSize(7);

        y += 2;
        doc.text(`Payment: ${sale.payment_method.toUpperCase()}`, lm, y);
        y += 4;
        doc.text(`Paid: $${sale.amount_paid.toFixed(2)}`, lm, y);
        y += 4;
        doc.text(`Change: $${sale.change_amount.toFixed(2)}`, lm, y);
        y += 8;

        // --- Footer & QR ---
        if (qrDataUrl) {
            doc.addImage(qrDataUrl, 'PNG', 40 - 10, y, 20, 20);
            y += 25;
        }

        doc.setFont('helvetica', 'italic');
        doc.text('Scan for digital copy', 40, y, { align: 'center' });
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Thank you for choosing PharmaCare!', 40, y, { align: 'center' });

        return doc;
    }, [sale, qrDataUrl]);

    const handlePrint = () => {
        if (receiptPDF) {
            receiptPDF.autoPrint();
            const blob = receiptPDF.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    };

    const handleDownload = () => {
        if (receiptPDF) {
            receiptPDF.save(`Receipt-${sale?.sale_number}.pdf`);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }
    if (!sale) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Sale Completed</h3>
                            <p className="text-xs text-slate-500">{sale.sale_number}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-100">
                    <div className="w-[300px] bg-white shadow-lg p-6 font-mono text-[10px] leading-relaxed relative receipt-paper">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-slate-200 to-transparent"></div>

                        <div className="text-center mb-4">
                            <h2 className="font-bold text-sm tracking-widest">PHARMACARE</h2>
                            <p className="text-[8px] text-slate-500">123 Health Ave, Medical District</p>
                            <p className="text-[8px] text-slate-500">Tel: +1 (555) 012-3456</p>
                        </div>

                        <div className="border-t border-dashed my-3"></div>

                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between"><span>Sale #:</span><span>{sale.sale_number}</span></div>
                            <div className="flex justify-between"><span>Date:</span><span>{format(new Date(sale.created_at), 'MMM dd, HH:mm')}</span></div>
                            <div className="flex justify-between"><span>Cashier:</span><span>{sale.cashier_name || 'System'}</span></div>
                        </div>

                        <div className="border-t border-dashed my-3"></div>

                        <table className="w-full text-left mb-4">
                            <thead>
                                <tr className="border-b border-dashed">
                                    <th className="py-1">Item</th>
                                    <th className="py-1 text-center">Qty</th>
                                    <th className="py-1 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.items.map((item, idx) => (
                                    <tr key={idx} className="align-top">
                                        <td className="py-1">
                                            {item.product_name}
                                            {item.discount > 0 && <div className="text-[8px] text-red-500">Disc: -${item.discount.toFixed(2)}</div>}
                                        </td>
                                        <td className="py-1 text-center">{item.quantity}</td>
                                        <td className="py-1 text-right">${item.total_price.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="border-t border-dashed my-3"></div>

                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between font-bold"><span>TOTAL:</span><span>${sale.total_amount.toFixed(2)}</span></div>
                            <div className="flex justify-between text-slate-500"><span>Paid:</span><span>${sale.amount_paid.toFixed(2)}</span></div>
                            <div className="flex justify-between text-slate-500"><span>Change:</span><span>${sale.change_amount.toFixed(2)}</span></div>
                        </div>

                        <div className="flex flex-col items-center gap-2 mt-6">
                            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-16 h-16" />}
                            <p className="text-[8px] text-slate-400 italic text-center">Scan for digital copy</p>
                            <p className="text-[9px] font-bold mt-2 text-center w-full">Thank you!</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t bg-slate-50 flex gap-3">
                    <Button
                        variant="ghost"
                        className="flex-1 gap-2"
                        onClick={handleDownload}
                    >
                        <Download size={18} />
                        Download
                    </Button>
                    <Button
                        className="flex-1 gap-2"
                        onClick={handlePrint}
                    >
                        <Printer size={18} />
                        Print
                    </Button>
                </div>
            </div>
        </div>
    );
};
