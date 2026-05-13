/**
 * ═══════════════════════════════════════════════════════════════════════
 * Contract Template Merge Engine
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Generates contract documents by merging template HTML with field values.
 * Supports variable interpolation, conditional sections, and date formatting.
 *
 * Usage:
 *   const html = mergeTemplate(templateHtml, mergeValues);
 *   const pdfBuffer = await generateContractPdf(html);
 */

import { storagePut } from "../storage";

/**
 * Merge a template HTML string with provided field values.
 * Variables in the template use {{fieldName}} syntax.
 * Conditional sections use {{#if fieldName}}...{{/if}} syntax.
 */
export function mergeTemplate(
  templateHtml: string,
  mergeValues: Record<string, string | number | boolean | null | undefined>
): string {
  let result = templateHtml;

  // Process conditional sections: {{#if fieldName}}content{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, fieldName: string, content: string) => {
      const value = mergeValues[fieldName];
      return value ? content : "";
    }
  );

  // Process inverse conditionals: {{#unless fieldName}}content{{/unless}}
  result = result.replace(
    /\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_match, fieldName: string, content: string) => {
      const value = mergeValues[fieldName];
      return !value ? content : "";
    }
  );

  // Replace all {{fieldName}} placeholders with values
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, fieldName: string) => {
    const value = mergeValues[fieldName];
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  });

  return result;
}

/**
 * Format a date string for contract display.
 */
export function formatContractDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate a full contract HTML document with standard styling.
 */
export function wrapContractHtml(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #1A3A5C;
      line-height: 1.6;
    }
    h1, h2, h3 { color: #1A3A5C; }
    .contract-header {
      text-align: center;
      border-bottom: 2px solid #7A5C0F;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .contract-header h1 { font-size: 24px; margin-bottom: 5px; }
    .contract-header .subtitle { color: #7A5C0F; font-size: 14px; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; margin-bottom: 8px; color: #7A5C0F; }
    .signature-block {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-line {
      width: 200px;
      border-top: 1px solid #1A3A5C;
      padding-top: 5px;
      text-align: center;
      font-size: 12px;
    }
    .date-line { font-size: 12px; color: #666; margin-top: 5px; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

/**
 * Store a generated contract HTML as a file and return the storage URL.
 */
export async function storeContractDocument(
  contractId: number,
  html: string,
  filename: string
): Promise<{ key: string; url: string }> {
  const key = `ember/contracts/${contractId}/${Date.now()}-${filename}`;
  const buffer = Buffer.from(html, "utf-8");
  return storagePut(key, buffer, "text/html");
}

/**
 * Build standard merge values from person and contract data.
 */
export function buildMergeValues(
  person: {
    fullName: string;
    designation?: string | null;
    email?: string | null;
    primaryPhone?: string;
    currentAddress?: string | null;
  },
  contractData: {
    startDate?: string;
    endDate?: string;
    salary?: string;
    entity?: string;
    propertyName?: string;
  }
): Record<string, string> {
  const values: Record<string, string> = {
    employee_name: person.fullName,
    designation: person.designation || "Associate",
    email: person.email || "",
    phone: person.primaryPhone || "",
    address: person.currentAddress || "",
    start_date: contractData.startDate ? formatContractDate(contractData.startDate) : "",
    end_date: contractData.endDate ? formatContractDate(contractData.endDate) : "",
    salary: contractData.salary || "",
    entity: contractData.entity || "Ember Property Management",
    property_name: contractData.propertyName || "",
    date_today: formatContractDate(new Date().toISOString()),
  };
  return values;
}
