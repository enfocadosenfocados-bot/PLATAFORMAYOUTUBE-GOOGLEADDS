const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  margin: 50,
  size: 'A4'
});

const outputPath = path.join(__dirname, 'Google_Ads_API_Integration_Aguamarina.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// Header / Title
doc.rect(50, 45, 495, 45).fill('#1a73e8');
doc.fillColor('#ffffff').fontSize(16).text('Aguamarina Joyería - Google Ads API Integration Design', 60, 58, { align: 'center' });

doc.moveDown(2);
doc.fillColor('#333333');

// 1. Executive Summary
doc.fontSize(13).fillColor('#1a73e8').text('1. Tool Overview & Executive Summary');
doc.rect(50, doc.y, 495, 1).fill('#e0e0e0');
doc.moveDown(0.5);
doc.fontSize(10).fillColor('#444444').text(
  'Aguamarina Marketing Platform is an in-house, private marketing automation software built specifically for Aguamarina Joyería. ' +
  'The tool enables internal staff to streamline the creation, configuration, and monitoring of Google Ads marketing campaigns ' +
  '(YouTube Video Ads, Search Ads, Display Ads, and Performance Max) directly from a centralized local dashboard, ' +
  'synchronizing high-value jewelry promotion assets with the official Google Ads account.'
);

doc.moveDown(1.2);

// 2. Technical Architecture & Credentials
doc.fontSize(13).fillColor('#1a73e8').text('2. Technical Architecture & Security Model');
doc.rect(50, doc.y, 495, 1).fill('#e0e0e0');
doc.moveDown(0.5);

doc.fontSize(10).fillColor('#444444')
  .text('• Environment & Technology Stack: Node.js (v20+), Express REST backend, TypeScript, official google-ads-api v25 SDK.', { indent: 10 })
  .text('• Hosting Environment: Secure internal localhost application operated exclusively by Aguamarina marketing staff.', { indent: 10 })
  .text('• Authentication Model: Google OAuth 2.0 Web Application flow using offline refresh tokens and developer tokens.', { indent: 10 })
  .text('• Google Cloud Project ID: 1000741529450 (aguamarina-automation).', { indent: 10 })
  .text('• Manager Account (MCC): 720-475-5391 (JOYERIA AGUAMARINA ADMINISTRADOR).', { indent: 10 })
  .text('• Client Account (Operating CID): 164-944-3437 (Joyeria Aguamarina).', { indent: 10 });

doc.moveDown(1.2);

// 3. Data Flow Diagram / Pipeline
doc.fontSize(13).fillColor('#1a73e8').text('3. End-to-End Data Flow');
doc.rect(50, doc.y, 495, 1).fill('#e0e0e0');
doc.moveDown(0.5);

const steps = [
  'Step 1: Campaign Configuration - Staff selects campaign type (Search / Video Ads), inputs daily budget, target locations (San José, Costa Rica), schedule dates, and final destination URL.',
  'Step 2: Client-side Validation - The dashboard validates character lengths (headlines <= 30 chars, descriptions <= 90 chars, call-to-actions) and parses YouTube video IDs before transmission.',
  'Step 3: Secure API Communication - The server securely initiates an authenticated gRPC session using Developer Token and OAuth refresh token via login_customer_id (720-475-5391).',
  'Step 4: Resource Mutate Execution - Executes atomic mutate operations: (1) CampaignBudget, (2) Campaign, (3) AdGroup, and (4) Responsive Search/Video Ad Assets in the target account (164-944-3437).',
  'Step 5: Status & Audit Logging - Live resource identifiers (Resource Names, Campaign IDs) are returned and displayed in the management interface for performance verification.'
];

steps.forEach(step => {
  doc.fontSize(9.5).fillColor('#333333').text(step, { indent: 10, paragraphGap: 5 });
});

doc.moveDown(1);

// 4. Compliance & Privacy Statement
doc.fontSize(13).fillColor('#1a73e8').text('4. Data Privacy, Storage & Compliance with Google Ads Policies');
doc.rect(50, doc.y, 495, 1).fill('#e0e0e0');
doc.moveDown(0.5);

doc.fontSize(10).fillColor('#444444').text(
  '• Internal Use Exclusivity: The application is strictly for internal business operations of Aguamarina Joyería. It does not sell ads, provide third-party agency services, or offer SaaS access to external entities.\n' +
  '• Data Retention: No third-party ad data or personal identifiable information (PII) is exported, stored, or scraped outside the official Google Ads platform.\n' +
  '• Rate Limits & Quotas: Campaign mutates are triggered on-demand via human user interaction, strictly adhering to Google Ads API rate limits and Minimum Functionality Requirements (MFR).\n' +
  '• Credential Security: OAuth Client secrets and developer tokens are stored securely in protected environment variables (.env) and never exposed publicly.'
);

doc.moveDown(1.5);
doc.fontSize(9).fillColor('#777777').text('Document generated for Google Ads Developer Token Review - Aguamarina Joyería © 2026', { align: 'center' });

doc.end();
console.log('PDF generado exitosamente en:', outputPath);
