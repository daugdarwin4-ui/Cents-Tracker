/**
 * Generates a CSV string from an array of objects.
 * Handles commas and quotes in values safely.
 */
function generateCSV(rows, columns) {
  if (!rows || rows.length === 0) {
    return columns.map((c) => c.label).join(',') + '\n';
  }

  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const dataRows = rows.map((row) =>
    columns.map((c) => escape(c.field ? row[c.field] : c.value(row))).join(',')
  );

  return [header, ...dataRows].join('\n');
}

module.exports = { generateCSV };
