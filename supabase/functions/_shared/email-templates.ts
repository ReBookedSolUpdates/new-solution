import { EMAIL_FOOTER } from "../../../shared/email-footer.ts";
// ============================================================
// MASTER EMAIL TEMPLATE — ReBooked Solutions
// All emails use createEmailTemplate() for a consistent look.
// ============================================================

export const EMAIL_STYLES = `
<style>
  body { font-family: Arial, sans-serif; background: #f3fef7; padding: 20px; color: #1f4e3d; margin: 0; }
  .container { max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .btn { display: inline-block; padding: 12px 20px; background: #3ab26f; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
  .btn-danger { display: inline-block; padding: 12px 20px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
  .link { color: #3ab26f; word-break: break-all; }
  .header { background: linear-gradient(135deg, #3ab26f 0%, #2d8f58 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 25px -30px; }
  .header-error { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 25px -30px; }
  .header-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 25px -30px; }
  .info-box { background: #f3fef7; border: 1px solid #3ab26f; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .info-box-error { background: #fef2f2; border: 1px solid #dc2626; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .info-box-success { background: #f0fdf4; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .info-box-warning { background: #fffbeb; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { color: #6b7280; font-weight: 600; }
  .detail-value { color: #1f4e3d; font-weight: 500; text-align: right; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  .total-row { font-size: 18px; font-weight: bold; color: #3ab26f; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 5px; font-size: 14px; }
</style>
`;

// Canonical footer — used in ALL emails
interface EmailTemplateData {
  title: string;
  headerType?: 'default' | 'error' | 'warning';
  headerText: string;
  headerSubtext?: string;
  headerEmoji?: string;
}

export function createEmailTemplate(
  data: EmailTemplateData,
  bodyContent: string,
  includeFooter: boolean = true
): string {
  const headerClass = data.headerType === 'error' ? 'header-error' : 
                     data.headerType === 'warning' ? 'header-warning' : 'header';
  const emoji = data.headerEmoji ? `${data.headerEmoji} ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  ${EMAIL_STYLES}
</head>
<body>
  <div class="container">
    <div class="${headerClass}">
      <h1 style="margin:0;font-size:22px;font-weight:bold;">${emoji}${data.headerText}</h1>
      ${data.headerSubtext ? `<p style="margin:8px 0 0;font-size:14px;opacity:0.9;">${data.headerSubtext}</p>` : ''}
    </div>
    
    ${bodyContent}
    
    ${includeFooter ? EMAIL_FOOTER : ''}
  </div>
</body>
</html>`;
}

/**
 * Helper to build a detail table row
 */
export function detailRow(label: string, value: string | number): string {
  return `
  <tr>
    <td style="color:#6b7280;font-weight:600;padding:7px 5px;border-bottom:1px solid #e5e7eb;font-size:13px;">${label}</td>
    <td style="color:#1f4e3d;font-weight:500;text-align:right;padding:7px 5px;border-bottom:1px solid #e5e7eb;font-size:13px;">${value}</td>
  </tr>`;
}

/**
 * Helper to build a section box
 */
export function infoSection(title: string, rows: string, type: 'default' | 'success' | 'warning' | 'error' = 'default'): string {
  const bgColor = type === 'success' ? '#f0fdf4' : type === 'warning' ? '#fffbeb' : type === 'error' ? '#fef2f2' : '#f3fef7';
  const borderColor = type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : type === 'error' ? '#dc2626' : '#3ab26f';
  return `
  <div style="background:${bgColor};border:1px solid ${borderColor};padding:15px;border-radius:8px;margin:15px 0;">
    <h3 style="margin:0 0 12px 0;color:#1f4e3d;font-size:15px;font-weight:bold;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`;
}
