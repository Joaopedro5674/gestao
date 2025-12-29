
export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    // Generate Headers from keys of first object
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header Row
        ...data.map(row => headers.map(fieldName => {
            const val = row[fieldName];
            // Escape quotes and wrap in quotes if string
            if (typeof val === 'string') {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Create download link
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
