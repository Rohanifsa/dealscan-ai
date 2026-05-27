// /**
//  * Generates 6 test PDF documents:
//  *   Set 1 (correct/): LC, Invoice, Bill of Lading — all fields match
//  *   Set 2 (incorrect/): LC, Invoice, Bill of Lading — deliberate mismatches
//  *
//  * Run: bun run scripts/generate-test-docs.ts
//  * Output: scripts/test-docs/
//  */

// import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
// import { mkdir, writeFile } from "fs/promises";
// import { existsSync } from "fs";
// import path from "path";

// const OUT_DIR = path.join(import.meta.dir, "test-docs");

// // ─── helpers ────────────────────────────────────────────────────────────────

// async function buildPdf(lines: string[]): Promise<Uint8Array> {
//   const pdfDoc = await PDFDocument.create();
//   const font = await pdfDoc.embedFont(StandardFonts.Courier);
//   const boldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

//   let page = pdfDoc.addPage([595, 842]); // A4
//   const margin = 50;
//   let y = 792;
//   const lineHeight = 16;

//   for (const raw of lines) {
//     if (y < 60) {
//       page = pdfDoc.addPage([595, 842]);
//       y = 792;
//     }

//     const isBold = raw.startsWith("**") && raw.endsWith("**");
//     const isSep = raw === "---";
//     const text = isBold ? raw.slice(2, -2) : raw;

//     if (isSep) {
//       page.drawLine({
//         start: { x: margin, y },
//         end: { x: 595 - margin, y },
//         thickness: 0.5,
//         color: rgb(0.5, 0.5, 0.5),
//       });
//       y -= lineHeight;
//       continue;
//     }

//     page.drawText(text, {
//       x: margin,
//       y,
//       size: isBold ? 12 : 10,
//       font: isBold ? boldFont : font,
//       color: rgb(0, 0, 0),
//     });
//     y -= lineHeight;
//   }

//   return pdfDoc.save();
// }

// async function save(subdir: string, filename: string, bytes: Uint8Array) {
//   const dir = path.join(OUT_DIR, subdir);
//   if (!existsSync(dir)) await mkdir(dir, { recursive: true });
//   await writeFile(path.join(dir, filename), bytes);
//   console.log(`  ✓  ${subdir}/${filename}`);
// }

// // ─── SET 1: CORRECT documents ───────────────────────────────────────────────

// const LC_REF = "LC-2024-001";
// const AMOUNT = "USD 250,000.00";
// const GOODS = "500 Metric Tonnes of Steel Pipes, Grade A, ASTM A53";
// const SELLER = "Acme Manufacturing Corp";
// const BUYER = "Global Trade Ltd";
// const PORT_LOAD = "Port of Shanghai, China";
// const PORT_DISC = "Port of Rotterdam, Netherlands";
// const VESSEL = "MV Pacific Star / Voyage 42W";
// const BL_NUM = "BL-20240315-001";
// const INVOICE_NUM = "INV-2024-0315";
// const ISSUE_DATE = "15 March 2024";
// const EXPIRY_DATE = "15 June 2024";
// const LATEST_SHIP = "30 April 2024";

// async function makeCorrectLC() {
//   return buildPdf([
//     "**IRREVOCABLE DOCUMENTARY LETTER OF CREDIT**",
//     "---",
//     `LC Reference      : ${LC_REF}`,
//     `Issue Date        : ${ISSUE_DATE}`,
//     `Expiry Date       : ${EXPIRY_DATE}`,
//     `Place of Expiry   : Rotterdam, Netherlands`,
//     "---",
//     "**ISSUING BANK**",
//     `Name              : First National Bank of Singapore`,
//     `SWIFT             : FNBSSGSG`,
//     `Address           : 10 Shenton Way, Singapore 068809`,
//     "---",
//     "**APPLICANT**",
//     `Name              : ${BUYER}`,
//     `Address           : 85 Fleet Street, London EC4Y 1AE, United Kingdom`,
//     "---",
//     "**BENEFICIARY**",
//     `Name              : ${SELLER}`,
//     `Address           : 22 Industrial Avenue, Shanghai 200001, China`,
//     "---",
//     "**CREDIT DETAILS**",
//     `Credit Amount     : ${AMOUNT}`,
//     `Currency          : US Dollar (USD)`,
//     `Credit Type       : Irrevocable, Sight`,
//     `Available With    : Any Bank by Negotiation`,
//     "---",
//     "**SHIPMENT DETAILS**",
//     `Port of Loading   : ${PORT_LOAD}`,
//     `Port of Discharge : ${PORT_DISC}`,
//     `Latest Shipment   : ${LATEST_SHIP}`,
//     `Partial Shipments : Not Allowed`,
//     `Transhipment      : Not Allowed`,
//     "---",
//     "**GOODS DESCRIPTION**",
//     `Description       : ${GOODS}`,
//     `HS Code           : 7306.30`,
//     `Unit Price        : USD 500.00 per Metric Tonne`,
//     `Quantity          : 500 Metric Tonnes`,
//     `Incoterms         : CIF Rotterdam`,
//     "---",
//     "**REQUIRED DOCUMENTS**",
//     `1. Signed Commercial Invoice in triplicate`,
//     `   - Invoice Number must reference LC Ref ${LC_REF}`,
//     `   - Amount must not exceed ${AMOUNT}`,
//     `2. Full Set (3/3) Original Ocean Bills of Lading`,
//     `   - Made out to order of First National Bank of Singapore`,
//     `   - Notify: ${BUYER}`,
//     `   - Marked "Freight Prepaid"`,
//     `3. Packing List in duplicate`,
//     `4. Certificate of Origin issued by Shanghai Chamber of Commerce`,
//     `5. Insurance Certificate for 110% of invoice value`,
//     "---",
//     "**SPECIAL CONDITIONS**",
//     `All documents must be presented within 21 days of shipment date`,
//     `but within the validity of this credit.`,
//     "---",
//     "**CHARGES**",
//     `All charges outside Singapore are for account of Beneficiary.`,
//     "---",
//     `Issued by: First National Bank of Singapore`,
//     `Authorized Signature: __________________________`,
//   ]);
// }

// async function makeCorrectInvoice() {
//   return buildPdf([
//     "**COMMERCIAL INVOICE**",
//     "---",
//     `Invoice Number    : ${INVOICE_NUM}`,
//     `Invoice Date      : ${ISSUE_DATE}`,
//     `LC Reference      : ${LC_REF}`,
//     `BL Reference      : ${BL_NUM}`,
//     "---",
//     "**SELLER (EXPORTER)**",
//     `Name              : ${SELLER}`,
//     `Address           : 22 Industrial Avenue, Shanghai 200001, China`,
//     `Tel               : +86 21 5555 0100`,
//     `Email             : trade@acmemfg.com`,
//     `Tax ID            : CN-91310000MA1FL3XX02`,
//     "---",
//     "**BUYER (IMPORTER)**",
//     `Name              : ${BUYER}`,
//     `Address           : 85 Fleet Street, London EC4Y 1AE, United Kingdom`,
//     `Tel               : +44 20 7946 0500`,
//     `Email             : imports@globaltrade.co.uk`,
//     "---",
//     "**SHIPMENT DETAILS**",
//     `Port of Loading   : ${PORT_LOAD}`,
//     `Port of Discharge : ${PORT_DISC}`,
//     `Vessel / Voyage   : ${VESSEL}`,
//     `Incoterms         : CIF Rotterdam`,
//     `Payment Terms     : Letter of Credit at Sight`,
//     "---",
//     "**GOODS DESCRIPTION**",
//     `HS Code           : 7306.30`,
//     `Description       : ${GOODS}`,
//     `Origin            : People's Republic of China`,
//     "---",
//     "**LINE ITEMS**",
//     `Item  Description                    Qty        Unit Price   Total`,
//     `---`,
//     `001   Steel Pipes, Grade A, ASTM A53  500 MT     USD 500.00   ${AMOUNT}`,
//     "---",
//     "**TOTALS**",
//     `Subtotal          : ${AMOUNT}`,
//     `Freight (CIF)     : Included`,
//     `Insurance         : Included`,
//     `**TOTAL INVOICE AMOUNT : ${AMOUNT}**`,
//     "---",
//     "**BANKING DETAILS**",
//     `Bank Name         : Bank of China, Shanghai Branch`,
//     `SWIFT             : BKCHCNBJ300`,
//     `Account Number    : 7628-4491-0032-11`,
//     `Account Name      : ${SELLER}`,
//     "---",
//     `Country of Origin : People's Republic of China`,
//     `I/We hereby certify that this invoice is true and correct.`,
//     ``,
//     `Signature: __________________________ Date: ${ISSUE_DATE}`,
//     `${SELLER}`,
//   ]);
// }

// async function makeCorrectBL() {
//   return buildPdf([
//     "**BILL OF LADING (ORIGINAL)**",
//     "---",
//     `Bill of Lading No.: ${BL_NUM}`,
//     `Date of Issue     : ${ISSUE_DATE}`,
//     `Place of Issue    : Shanghai, China`,
//     "---",
//     "**SHIPPER**",
//     `Name              : ${SELLER}`,
//     `Address           : 22 Industrial Avenue, Shanghai 200001, China`,
//     "---",
//     "**CONSIGNEE**",
//     `To Order of: First National Bank of Singapore`,
//     "---",
//     "**NOTIFY PARTY**",
//     `Name              : ${BUYER}`,
//     `Address           : 85 Fleet Street, London EC4Y 1AE, United Kingdom`,
//     `Tel               : +44 20 7946 0500`,
//     "---",
//     "**VESSEL & VOYAGE**",
//     `Vessel Name       : MV Pacific Star`,
//     `Voyage Number     : 42W`,
//     `Flag              : Panama`,
//     `Carrier           : Pacific Shipping Lines Ltd`,
//     "---",
//     "**PORTS**",
//     `Port of Loading   : ${PORT_LOAD}`,
//     `Port of Discharge : ${PORT_DISC}`,
//     `Place of Receipt  : Shanghai Container Terminal`,
//     `Place of Delivery : Rotterdam Europort`,
//     `Freight           : PREPAID`,
//     "---",
//     "**CARGO DESCRIPTION**",
//     `Marks & Numbers   : ACME/LC-2024-001/ROTTERDAM`,
//     `No. of Packages   : 50 (Fifty) Steel Bundles`,
//     `Description       : ${GOODS}`,
//     `HS Code           : 7306.30`,
//     `Gross Weight      : 502,500 KG (Including Packaging)`,
//     `Net Weight        : 500,000 KG`,
//     `Measurement       : 285 CBM`,
//     "---",
//     "**FREIGHT & CHARGES**",
//     `Freight           : Prepaid`,
//     `Collect           : Nil`,
//     "---",
//     "**ON BOARD NOTATION**",
//     `Shipped on Board Date: ${ISSUE_DATE}`,
//     `Laden on Board at Port of Shanghai, China`,
//     "---",
//     `Number of Original Bills of Lading: THREE (3)`,
//     ``,
//     `IN WITNESS WHEREOF the Carrier has signed THREE (3) Bills of`,
//     `Lading, all of this tenor and date.`,
//     ``,
//     `For Pacific Shipping Lines Ltd`,
//     `As Carrier`,
//     ``,
//     `Signature: __________________________ Date: ${ISSUE_DATE}`,
//   ]);
// }

// // ─── SET 2: INCORRECT documents (deliberate mismatches) ─────────────────────
// // Discrepancies introduced:
// //   BL  - Port of Loading is SINGAPORE (should be Shanghai)
// //   BL  - Quantity is 480 MT (should be 500 MT)
// //   INV - Invoice amount is USD 275,000 (should be USD 250,000)
// //   INV - Goods description says "Steel Rods" (should be "Steel Pipes")
// //   LC  - Expiry date is 30 April 2024 (before latest shipment — already tight)
// //         Amount cap is USD 250,000 but invoice says USD 275,000

// async function makeIncorrectLC() {
//   return buildPdf([
//     "**IRREVOCABLE DOCUMENTARY LETTER OF CREDIT**",
//     "---",
//     `LC Reference      : ${LC_REF}`,
//     `Issue Date        : ${ISSUE_DATE}`,
//     `Expiry Date       : 30 April 2024`,
//     `Place of Expiry   : Rotterdam, Netherlands`,
//     "---",
//     "**ISSUING BANK**",
//     `Name              : First National Bank of Singapore`,
//     `SWIFT             : FNBSSGSG`,
//     `Address           : 10 Shenton Way, Singapore 068809`,
//     "---",
//     "**APPLICANT**",
//     `Name              : ${BUYER}`,
//     `Address           : 85 Fleet Street, London EC4Y 1AE, United Kingdom`,
//     "---",
//     "**BENEFICIARY**",
//     `Name              : ${SELLER}`,
//     `Address           : 22 Industrial Avenue, Shanghai 200001, China`,
//     "---",
//     "**CREDIT DETAILS**",
//     `Credit Amount     : ${AMOUNT}`,
//     `Currency          : US Dollar (USD)`,
//     `Credit Type       : Irrevocable, Sight`,
//     `Available With    : Any Bank by Negotiation`,
//     "---",
//     "**SHIPMENT DETAILS**",
//     `Port of Loading   : ${PORT_LOAD}`,
//     `Port of Discharge : ${PORT_DISC}`,
//     `Latest Shipment   : ${LATEST_SHIP}`,
//     `Partial Shipments : Not Allowed`,
//     `Transhipment      : Not Allowed`,
//     "---",
//     "**GOODS DESCRIPTION**",
//     `Description       : ${GOODS}`,
//     `HS Code           : 7306.30`,
//     `Unit Price        : USD 500.00 per Metric Tonne`,
//     `Quantity          : 500 Metric Tonnes`,
//     `Incoterms         : CIF Rotterdam`,
//     "---",
//     "**REQUIRED DOCUMENTS**",
//     `1. Signed Commercial Invoice in triplicate`,
//     `   - Invoice Number must reference LC Ref ${LC_REF}`,
//     `   - Amount must not exceed ${AMOUNT}`,
//     `2. Full Set (3/3) Original Ocean Bills of Lading`,
//     `   - Made out to order of First National Bank of Singapore`,
//     `   - Notify: ${BUYER}`,
//     `   - Marked "Freight Prepaid"`,
//     `3. Packing List in duplicate`,
//     `4. Certificate of Origin issued by Shanghai Chamber of Commerce`,
//     `5. Insurance Certificate for 110% of invoice value`,
//     "---",
//     `Issued by: First National Bank of Singapore`,
//     `Authorized Signature: __________________________`,
//   ]);
// }

// async function makeIncorrectInvoice() {
//   return buildPdf([
//     "**COMMERCIAL INVOICE**",
//     "---",
//     `Invoice Number    : ${INVOICE_NUM}`,
//     `Invoice Date      : ${ISSUE_DATE}`,
//     `LC Reference      : ${LC_REF}`,
//     `BL Reference      : ${BL_NUM}`,
//     "---",
//     "**SELLER (EXPORTER)**",
//     `Name              : ${SELLER}`,
//     `Address           : 22 Industrial Avenue, Shanghai 200001, China`,
//     `Tel               : +86 21 5555 0100`,
//     `Email             : trade@acmemfg.com`,
//     "---",
//     "**BUYER (IMPORTER)**",
//     `Name              : ${BUYER}`,
//     `Address           : 85 Fleet Street, London EC4Y 1AE, United Kingdom`,
//     "---",
//     "**SHIPMENT DETAILS**",
//     `Port of Loading   : ${PORT_LOAD}`,
//     `Port of Discharge : ${PORT_DISC}`,
//     `Vessel / Voyage   : ${VESSEL}`,
//     `Incoterms         : CIF Rotterdam`,
//     "---",
//     "**GOODS DESCRIPTION**",
//     `HS Code           : 7306.30`,
//     // MISMATCH 1: Steel Rods instead of Steel Pipes
//     `Description       : 500 Metric Tonnes of Steel Rods, Grade A, ASTM A53`,
//     `Origin            : People's Republic of China`,
//     "---",
//     "**LINE ITEMS**",
//     `Item  Description                    Qty        Unit Price   Total`,
//     `---`,
//     // MISMATCH 2: Amount USD 275,000 (LC allows max USD 250,000)
//     `001   Steel Rods, Grade A, ASTM A53   500 MT     USD 550.00   USD 275,000.00`,
//     "---",
//     "**TOTALS**",
//     `Subtotal          : USD 275,000.00`,
//     `Freight (CIF)     : Included`,
//     `Insurance         : Included`,
//     `**TOTAL INVOICE AMOUNT : USD 275,000.00**`,
//     "---",
//     `Country of Origin : People's Republic of China`,
//     `Signature: __________________________ Date: ${ISSUE_DATE}`,
//     `${SELLER}`,
//   ]);
// }

// async function makeIncorrectBL() {
//   return buildPdf([
//     "**BILL OF LADING (ORIGINAL)**",
//     "---",
//     `Bill of Lading No.: ${BL_NUM}`,
//     `Date of Issue     : ${ISSUE_DATE}`,
//     // MISMATCH 3: Place of Issue is Singapore (LC says Shanghai)
//     `Place of Issue    : Singapore`,
//     "---",
//     "**SHIPPER**",
//     `Name              : ${SELLER}`,
//     `Address           : 22 Industrial Avenue, Shanghai 200001, China`,
//     "---",
//     "**CONSIGNEE**",
//     `To Order of: First National Bank of Singapore`,
//     "---",
//     "**NOTIFY PARTY**",
//     `Name              : ${BUYER}`,
//     `Address           : 85 Fleet Street, London EC4Y 1AE, United Kingdom`,
//     "---",
//     "**VESSEL & VOYAGE**",
//     `Vessel Name       : MV Pacific Star`,
//     `Voyage Number     : 42W`,
//     `Flag              : Panama`,
//     `Carrier           : Pacific Shipping Lines Ltd`,
//     "---",
//     "**PORTS**",
//     // MISMATCH 4: Port of Loading is Singapore (LC requires Shanghai)
//     `Port of Loading   : Port of Singapore`,
//     `Port of Discharge : ${PORT_DISC}`,
//     `Place of Receipt  : Singapore Container Terminal`,
//     `Place of Delivery : Rotterdam Europort`,
//     `Freight           : PREPAID`,
//     "---",
//     "**CARGO DESCRIPTION**",
//     `Marks & Numbers   : ACME/LC-2024-001/ROTTERDAM`,
//     // MISMATCH 5: Quantity 480 MT (LC requires 500 MT)
//     `No. of Packages   : 48 (Forty-Eight) Steel Bundles`,
//     `Description       : 480 Metric Tonnes of Steel Pipes, Grade A, ASTM A53`,
//     `HS Code           : 7306.30`,
//     `Gross Weight      : 482,400 KG (Including Packaging)`,
//     `Net Weight        : 480,000 KG`,
//     `Measurement       : 274 CBM`,
//     "---",
//     "**FREIGHT & CHARGES**",
//     `Freight           : Prepaid`,
//     "---",
//     "**ON BOARD NOTATION**",
//     `Shipped on Board Date: ${ISSUE_DATE}`,
//     `Laden on Board at Port of Singapore`,
//     "---",
//     `Number of Original Bills of Lading: THREE (3)`,
//     ``,
//     `For Pacific Shipping Lines Ltd`,
//     `As Carrier`,
//     ``,
//     `Signature: __________________________ Date: ${ISSUE_DATE}`,
//   ]);
// }

// // ─── Main ────────────────────────────────────────────────────────────────────

// console.log("Generating test documents...\n");

// const [lcOk, invOk, blOk, lcBad, invBad, blBad] = await Promise.all([
//   makeCorrectLC(),
//   makeCorrectInvoice(),
//   makeCorrectBL(),
//   makeIncorrectLC(),
//   makeIncorrectInvoice(),
//   makeIncorrectBL(),
// ]);

// await Promise.all([
//   save("correct", "letter-of-credit.pdf", lcOk),
//   save("correct", "commercial-invoice.pdf", invOk),
//   save("correct", "bill-of-lading.pdf", blOk),
//   save("incorrect", "letter-of-credit.pdf", lcBad),
//   save("incorrect", "commercial-invoice.pdf", invBad),
//   save("incorrect", "bill-of-lading.pdf", blBad),
// ]);

// console.log("\nDone! Files saved to scripts/test-docs/");
// console.log("\n── SET 1 (correct/) — all fields match ──────────────────────");
// console.log("  LC:      LC-2024-001 | USD 250,000 | Acme → Global Trade");
// console.log("  Invoice: USD 250,000 | 500 MT Steel Pipes");
// console.log("  BL:      Port of Shanghai → Rotterdam | 500 MT");
// console.log("\n── SET 2 (incorrect/) — deliberate mismatches ───────────────");
// console.log("  LC:      Expiry 30 Apr 2024 (same as latest shipment date)");
// console.log("  Invoice: USD 275,000 (exceeds LC) | 'Steel Rods' not Pipes");
// console.log("  BL:      Port of Singapore (not Shanghai) | 480 MT (not 500)");
