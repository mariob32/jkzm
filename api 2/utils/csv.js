/**
 * JKZM CSV Helper - Excel-friendly CSV export utilities
 * UTF-8 BOM + delimiter `;` + proper escaping + newline terminator
 */

const BOM = '\uFEFF';
const DELIMITER = ';';
const NEWLINE = '\n';

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
 * Get today's date in YYYY-MM-DD format
 */
function getToday() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Build CSV string from headers and rows
 * @param {string[]} headers - Array of header names
 * @param {Array<Array<any>>} rows - Array of row arrays
 * @returns {string} CSV string with BOM and trailing newline
 */
function buildCSV(headers, rows) {
    const headerLine = headers.join(DELIMITER);
    const dataLines = rows.map(row => row.map(escapeValue).join(DELIMITER));
    return BOM + [headerLine, ...dataLines].join(NEWLINE) + NEWLINE;
}

/**
 * Build header-only CSV string
 * @param {string[]} headers - Array of header names
 * @returns {string} CSV string with BOM and trailing newline
 */
function buildEmptyCSV(headers) {
    return BOM + headers.join(DELIMITER) + NEWLINE;
}

/**
 * Set HTTP response headers for CSV download
 * @param {object} res - Express/Vercel response object
 * @param {string} exportName - Export name (e.g., 'tasks', 'vaccinations')
 */
function setCSVHeaders(res, exportName) {
    const filename = `jkzm_${exportName}_${getToday()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

/**
 * Send empty CSV with headers only (for errors or no data)
 * @param {object} res - Express/Vercel response object
 * @param {string[]} headers - Array of header names
 * @param {string} exportName - Export name for filename
 */
function sendEmptyCSV(res, headers, exportName) {
    setCSVHeaders(res, exportName);
    return res.status(200).send(buildEmptyCSV(headers));
}

/**
 * Send CSV response
 * @param {object} res - Express/Vercel response object
 * @param {string[]} headers - Array of header names
 * @param {Array<Array<any>>} rows - Array of row arrays
 * @param {string} exportName - Export name for filename
 */
function sendCSV(res, headers, rows, exportName) {
    setCSVHeaders(res, exportName);
    return res.status(200).send(buildCSV(headers, rows));
}

module.exports = {
    BOM,
    DELIMITER,
    NEWLINE,
    escapeValue,
    getToday,
    buildCSV,
    buildEmptyCSV,
    setCSVHeaders,
    sendEmptyCSV,
    sendCSV
};
