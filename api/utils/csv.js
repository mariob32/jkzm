/**
 * JKZM CSV Helper - Excel-friendly CSV export utilities
 * UTF-8 BOM + delimiter `;` + proper escaping
 */

const BOM = '\uFEFF';
const DELIMITER = ';';

/**
 * Escape CSV value for Excel compatibility
 * - ak field obsahuje ; alebo " alebo newline → obaliť do "
 * - " vnútri → zdvojiť na ""
 */
function escapeValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(DELIMITER) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Build CSV string from headers and rows
 * @param {string[]} headers - Array of header names
 * @param {Array<Array<any>>} rows - Array of row arrays
 * @returns {string} CSV string with BOM
 */
function buildCSV(headers, rows) {
    const headerLine = headers.join(DELIMITER);
    const dataLines = rows.map(row => row.map(escapeValue).join(DELIMITER));
    return BOM + [headerLine, ...dataLines].join('\n');
}

/**
 * Set HTTP response headers for CSV download
 * @param {object} res - Express/Vercel response object
 * @param {string} filenamePrefix - Prefix for filename (e.g., 'tasks', 'vaccinations')
 */
function setCSVHeaders(res, filenamePrefix) {
    const today = new Date().toISOString().split('T')[0];
    const filename = `${filenamePrefix}_${today}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

/**
 * Send empty CSV with headers only (for errors or no data)
 * @param {object} res - Express/Vercel response object
 * @param {string[]} headers - Array of header names
 * @param {string} filenamePrefix - Prefix for filename
 */
function sendEmptyCSV(res, headers, filenamePrefix) {
    setCSVHeaders(res, filenamePrefix);
    return res.status(200).send(BOM + headers.join(DELIMITER));
}

/**
 * Send CSV response
 * @param {object} res - Express/Vercel response object
 * @param {string[]} headers - Array of header names
 * @param {Array<Array<any>>} rows - Array of row arrays
 * @param {string} filenamePrefix - Prefix for filename
 */
function sendCSV(res, headers, rows, filenamePrefix) {
    setCSVHeaders(res, filenamePrefix);
    return res.status(200).send(buildCSV(headers, rows));
}

module.exports = {
    BOM,
    DELIMITER,
    escapeValue,
    buildCSV,
    setCSVHeaders,
    sendEmptyCSV,
    sendCSV
};
