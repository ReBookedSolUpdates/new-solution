import { EMAIL_FOOTER } from "../../shared/email-footer";
export { EMAIL_FOOTER } from "../../shared/email-footer";
// CENTRALIZED EMAIL STYLING SYSTEM FOR REBOOKED MARKETPLACE
// All email templates should use these standardized styles

export const EMAIL_STYLES = `
<style>
  body {
    font-family: Arial, sans-serif;
    background: #f3fef7;
    padding: 20px;
    color: #1f4e3d;
    margin: 0;
  }
  .container {
    max-width: 500px;
    margin: auto;
    background: #ffffff;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .btn {
    display: inline-block;
    padding: 12px 20px;
    background: #3ab26f;
    color: #ffffff;
    text-decoration: none;
    border-radius: 5px;
    margin-top: 20px;
    font-weight: bold;
  }
  .link {
    color: #3ab26f;
    word-break: break-all;
  }
  .header {
    background: #3ab26f;
    color: white;
    padding: 20px;
    text-align: center;
    border-radius: 10px 10px 0 0;
    margin: -30px -30px 20px -30px;
  }
  .header-error {
    background: #dc2626;
    color: white;
    padding: 20px;
    text-align: center;
    border-radius: 10px 10px 0 0;
    margin: -30px -30px 20px -30px;
  }
  .header-warning {
    background: #f59e0b;
    color: white;
    padding: 20px;
    text-align: center;
    border-radius: 10px 10px 0 0;
    margin: -30px -30px 20px -30px;
  }
  .footer-text {
    font-size: 12px;
    color: #6b7280;
    margin-top: 15px;
  }
  .slogan {
    font-style: italic;
    color: #3ab26f;
    font-size: 13px;
    margin-top: 10px;
  }
  .social-links {
    margin: 10px 0;
  }
  .social-links a {
    color: #3ab26f;
    text-decoration: none;
    margin-right: 12px;
    font-size: 13px;
  }
  .info-box {
    background: #f3fef7;
    border: 1px solid #3ab26f;
    padding: 15px;
    border-radius: 5px;
    margin: 15px 0;
  }
  .info-box-error {
    background: #fef2f2;
    border: 1px solid #dc2626;
    padding: 15px;
    border-radius: 5px;
    margin: 15px 0;
  }
  .info-box-warning {
    background: #fffbeb;
    border: 1px solid #f59e0b;
    padding: 15px;
    border-radius: 5px;
    margin: 15px 0;
  }
  .info-box-success {
    background: #f0fdf4;
    border: 1px solid #10b981;
    padding: 15px;
    border-radius: 5px;
    margin: 15px 0;
  }
  .total {
    font-weight: bold;
    font-size: 18px;
    color: #3ab26f;
  }
</style>
`;

export interface EmailTemplateData {
  title: string;
  headerType?: 'default' | 'error' | 'warning';
  headerText: string;
  headerSubtext?: string;
}

export function createEmailTemplate(
  data: EmailTemplateData,
  bodyContent: string,
  includeFooter: boolean = true
): string {
  const headerClass = data.headerType === 'error' ? 'header-error' : 
                     data.headerType === 'warning' ? 'header-warning' : 'header';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${data.title}</title>
  ${EMAIL_STYLES}
</head>
<body>
  <div class="container">
    <div class="${headerClass}">
      <h1 style="margin:0;font-size:22px;">${data.headerText}</h1>
      ${data.headerSubtext ? `<p style="margin:5px 0 0;font-size:14px;">${data.headerSubtext}</p>` : ''}
    </div>
    
    ${bodyContent}
    
    ${includeFooter ? EMAIL_FOOTER : ''}
  </div>
</body>
</html>`;
}

// Email template types for the developer dashboard
export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'orders' | 'auth' | 'notifications' | 'banking' | 'general';
  requiredFields: string[];
  defaultData: Record<string, any>;
  generator: (data: any) => { html: string; text: string; subject: string };
}
