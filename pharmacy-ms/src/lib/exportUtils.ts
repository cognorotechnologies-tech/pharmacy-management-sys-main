export function exportToCsv<T extends Record<string, any>>(filename: string, data: T[]) {
    if (!data || !data.length) {
        alert('No data available to export.');
        return;
    }

    const headers = Object.keys(data[0]);
    const processCell = (cell: any) => {
        let cellStr = cell === null || cell === undefined ? '' : String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            cellStr = `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
    };

    const csvContent = [
        headers.map(h => processCell(h.replace(/_/g, ' ').toUpperCase())).join(','),
        ...data.map(row => headers.map(header => processCell(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
