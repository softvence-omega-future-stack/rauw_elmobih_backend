/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) return '';

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.map(escapeCSVValue).join(',');

  // Create data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((header) => {
        const value = row[header];
        return escapeCSVValue(value);
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return '';

  let stringValue = String(value);

  // If value contains comma, newline, or quote, wrap in quotes
  if (
    stringValue.includes(',') ||
    stringValue.includes('\n') ||
    stringValue.includes('"')
  ) {
    // Escape quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Format submission data for CSV export
 */
export function formatSubmissionsForCSV(submissions: any[]): any[] {
  return submissions.map((submission) => ({
    'Submission ID': submission.id,
    'Date & Time': new Date(submission.submittedAt).toISOString(),
    Language: submission.language.toUpperCase(),
    'Age Group': submission.ageGroup.replace('AGE_', '').replace('_', '-'),
    'WHO-5 Score': submission.score,
    'Raw Score': submission.rawScore,
    'Color Level': submission.colorLevel,
    'Q1 Score': submission.responses.q1,
    'Q2 Score': submission.responses.q2,
    'Q3 Score': submission.responses.q3,
    'Q4 Score': submission.responses.q4,
    'Q5 Score': submission.responses.q5,
    Platform: submission.platform || 'N/A',
  }));
}