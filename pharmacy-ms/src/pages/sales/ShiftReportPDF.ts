import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import type { ShiftStats } from '@/hooks/useShifts';

interface ShiftReportData {
    id: string;
    stats: ShiftStats;
}

export const generateShiftReportPDF = (data: ShiftReportData) => {
    const { stats } = data;
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIFT CLOSING REPORT', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated At: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`, 105, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 15;

    // Summary Section
    const drawRow = (label: string, value: string, isBold = false) => {
        if (isBold) doc.setFont('helvetica', 'bold');
        doc.text(label, 30, y);
        doc.text(value, 180, y, { align: 'right' });
        if (isBold) doc.setFont('helvetica', 'normal');
        y += 10;
    };

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REVENUE SUMMARY', 30, y);
    y += 10;
    doc.setFont('helvetica', 'normal');

    drawRow('Total Transaction Count:', String(stats.count));
    drawRow('Gross Revenue:', `$${stats.revenue.toFixed(2)}`);
    drawRow('Total Discounts Given:', `-$${stats.discounts.toFixed(2)}`);
    y += 5;
    drawRow('NET REVENUE:', `$${(stats.revenue).toFixed(2)}`, true);

    y += 15;

    // Payment Method Breakdown
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT BREAKDOWN', 30, y);
    y += 10;
    doc.setFont('helvetica', 'normal');

    drawRow('Cash Collected:', `$${stats.cash.toFixed(2)}`);
    drawRow('Card Payments:', `$${stats.card.toFixed(2)}`);
    drawRow('Insurance Claims:', `$${stats.insurance.toFixed(2)}`);

    y += 20;

    // Metrics
    doc.setFont('helvetica', 'bold');
    doc.text('PERFORMANCE METRICS', 30, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    drawRow('Average Transaction Value:', `$${stats.avg_transaction.toFixed(2)}`);

    // Footer
    y = 270;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('This is a system generated document. Shift ID: ' + data.id, 105, y, { align: 'center' });
    y += 5;
    doc.text('Confidential - Internal Use Only', 105, y, { align: 'center' });

    return doc;
};
