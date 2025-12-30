import * as XLSX from 'xlsx';

export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            const val = row[fieldName];
            if (typeof val === 'string') {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

interface ExcelSheetData {
    name: string;
    data: any[];
    metadata?: {
        label: string;
        value: string;
    }[];
}

export function exportToExcel(sheets: ExcelSheetData[], filename: string) {
    const wb = XLSX.utils.book_new();

    sheets.forEach(sheet => {
        // Create an array with metadata rows first
        const worksheetData: any[][] = [];

        if (sheet.metadata && sheet.metadata.length > 0) {
            sheet.metadata.forEach(meta => {
                worksheetData.push([meta.label, meta.value]);
            });
            worksheetData.push([]); // Empty row as separator
        }

        if (sheet.data.length > 0) {
            // Get headers
            const headers = Object.keys(sheet.data[0]);
            worksheetData.push(headers);

            // Add data rows
            sheet.data.forEach(row => {
                worksheetData.push(headers.map(header => row[header]));
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });

    XLSX.writeFile(wb, filename);
}
