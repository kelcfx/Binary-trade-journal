export const downloadCSV = (data: Array<Record<string, unknown>>, filename = "export.csv") => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map(row =>
        headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                value = '';
            }
            if (typeof value === 'number') {
                return value.toFixed(2);
            }
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (
                typeof value === 'object' &&
                value !== null &&
                'seconds' in value &&
                typeof (value as { seconds: number }).seconds === 'number'
            ) {
                return new Date((value as { seconds: number }).seconds * 1000).toISOString();
            }
            return value;
        }).join(',')
    )
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  