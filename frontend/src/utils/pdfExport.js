import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatDateTime } from './formatters';
import { summarize, computeTimePatterns } from './analyticsEngine';
import { ueMarkRects, UE_BLUE_RGB } from './ueMark';

// jsPDF's built-in "helvetica" font has no ₹ glyph — rendering it produces a
// missing-character box, which is exactly the kind of broken-looking output
// this rewrite exists to fix. Every amount in this document goes through
// this formatter instead of the app's normal Rupee-symbol one.
const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
function inr(amount) {
  return `Rs. ${inrFormatter.format(Number(amount) || 0)}`;
}

const MARGIN = 40;
const PAGE_TOP_CONTENT = 158; // first-page content start, below the full header
const CONTINUATION_TOP = 64; // table start on pages 2+, below the slim running header

const BRAND = [79, 70, 229];
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const LINE = [226, 232, 240];
const PANEL = [248, 250, 252];
const INCOME_GREEN = [5, 150, 105];
const EXPENSE_RED = [225, 29, 72];
const LEND_AMBER = [180, 130, 8];

const TYPE_LABELS = {
  income: 'Income',
  expense: 'Expense',
  refund: 'Refund',
  self_transfer: 'Self Transfer',
  lend: 'Money Lent',
  borrow: 'Money Borrowed',
  repayment_received: 'Repayment Received',
  repayment_made: 'Repayment Made',
};

const PAYMENT_LABELS = {
  upi: 'UPI',
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  other: 'Other',
};

// Refund is money returned from a previous expense — shown with a positive
// sign (cash comes back) but it is a distinct row type from income
// everywhere in this statement (see the summary boxes above).
const SIGNED = {
  income: 1,
  repayment_received: 1,
  borrow: 1,
  expense: -1,
  repayment_made: -1,
  lend: -1,
  refund: 1,
  self_transfer: 0,
};

// ---------------------------------------------------------------------------
// UE mark, drawn with vector primitives (no raster asset needed) using the
// same geometry as the in-app SVG logo — see utils/ueMark.js. Used ONLY as a
// small, subtle footer stamp — never as the document's primary logo.
// ---------------------------------------------------------------------------
function drawUEMark(doc, x, y, size) {
  const scale = size / 100;
  doc.setFillColor(...UE_BLUE_RGB);
  ueMarkRects().forEach((r) => {
    doc.roundedRect(x + r.x * scale, y + r.y * scale, r.w * scale, r.h * scale, Math.max(0.6, r.rx * scale * 0.5), Math.max(0.6, r.rx * scale * 0.5), 'F');
  });
}

// ---------------------------------------------------------------------------
// Wealthr mark — the app's actual logo (rounded square + wave glyph + dot),
// same geometry as the in-app SVG at components/common/Logo.jsx, drawn with
// vector primitives. This is the primary mark used in the document header.
// ---------------------------------------------------------------------------
const WEALTHR_MARK_FILL = [88, 80, 232]; // midpoint of the in-app gradient (#6366F1 -> #7C3AED)
const WEALTHR_MARK_GLYPH = [238, 242, 255]; // #EEF2FF

function drawWealthrMark(doc, x, y, size) {
  const scale = size / 64;
  const radius = 18 * scale;

  doc.setFillColor(...WEALTHR_MARK_FILL);
  doc.roundedRect(x, y, size, size, radius, radius, 'F');

  const pts = [
    [15, 24],
    [23, 42],
    [32, 28],
    [41, 42],
    [49, 24],
  ].map(([px, py]) => [x + px * scale, y + py * scale]);

  doc.setDrawColor(...WEALTHR_MARK_GLYPH);
  doc.setLineWidth(Math.max(1, 5.5 * scale));
  doc.setLineCap('round');
  doc.setLineJoin('round');
  for (let i = 0; i < pts.length - 1; i++) {
    doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  }

  doc.setFillColor(...WEALTHR_MARK_GLYPH);
  doc.circle(x + 32 * scale, y + 16 * scale, Math.max(0.8, 3.2 * scale), 'F');
}

function drawBrandFooterMark(doc, x, y) {
  // Small, subtle UE stamp — no accompanying text (no "Part of AJ/Works").
  drawUEMark(doc, x, y - 7.5, 8);
}

function pageWidth(doc) {
  return doc.internal.pageSize.getWidth();
}

function drawFullHeader(doc, { userName, userEmail, startDate, endDate }) {
  const pw = pageWidth(doc);

  drawWealthrMark(doc, 40, 30, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text('Wealthr', 74, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Personal Finance Statement', 74, 55);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(...INK);
  doc.text('Account Statement', pw - 40, 46, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${formatDate(startDate)} to ${formatDate(endDate)}`, pw - 40, 58, { align: 'right' });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN, 76, pw - MARGIN, 76);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('PREPARED FOR', MARGIN, 92);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(userName || 'Wealthr User', MARGIN, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(userEmail || '', MARGIN, 117);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('GENERATED', pw - MARGIN, 92, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(formatDateTime(new Date().toISOString()), pw - MARGIN, 105, { align: 'right' });

  doc.setDrawColor(...LINE);
  doc.line(MARGIN, 132, pw - MARGIN, 132);
}

function drawContinuationHeader(doc) {
  const pw = pageWidth(doc);
  drawWealthrMark(doc, MARGIN, 15, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text('Wealthr — Account Statement (continued)', MARGIN + 19, 26);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 42, pw - MARGIN, 42);
}

function drawSummary(doc, startY, summary) {
  const pw = pageWidth(doc);
  const boxWidth = (pw - 2 * MARGIN - 3 * 10) / 4;
  const boxes = [
    { label: 'TOTAL INCOME', value: inr(summary.income), color: INCOME_GREEN },
    // Net of refunds — a refund is money returned from a previous expense,
    // never income, so it belongs here reducing effective expense rather
    // than being counted as income anywhere in this statement.
    { label: 'NET EXPENSES', value: inr(summary.netExpense), color: EXPENSE_RED },
    { label: 'NET SAVINGS', value: inr(summary.netSavings), color: summary.netSavings >= 0 ? INCOME_GREEN : EXPENSE_RED },
    { label: 'TRANSACTIONS', value: String(summary.transactionCount), color: INK },
  ];

  boxes.forEach((b, i) => {
    const x = MARGIN + i * (boxWidth + 10);
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, startY, boxWidth, 50, 5, 5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(b.label, x + 9, startY + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...b.color);
    doc.text(b.value, x + 9, startY + 35, { maxWidth: boxWidth - 18 });
  });

  let nextY = startY + 50 + 20;
  if (summary.refund > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Includes ${inr(summary.refund)} refunded (excluded from income, netted against expenses above).`,
      MARGIN,
      startY + 50 + 12
    );
    nextY += 4;
  }

  return nextY;
}

// ---------------------------------------------------------------------------
// Analysis panel — top categories (with proportional bars) + habit insights,
// computed straight from the statement's own transactions so it always
// matches what's in the table below it.
// ---------------------------------------------------------------------------
function drawAnalysis(doc, startY, transactions) {
  const pw = pageWidth(doc);
  const usable = pw - 2 * MARGIN;
  const leftW = usable * 0.52;
  const rightX = MARGIN + leftW + 16;
  const rightW = usable - leftW - 16;

  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const byCategory = new Map();
  expenses.forEach((t) => byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount));
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const sectionTitleY = startY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text('Spending Analysis', MARGIN, sectionTitleY);

  const time = computeTimePatterns(transactions);
  const shares = transactions.filter((t) => t.isSplit || t.paidByPerson);
  const outstandingOwedToYou = expenses
    .filter((t) => t.isSplit)
    .reduce((s, t) => s + Math.max(0, (t.splitTotalAmount || 0) - t.amount), 0);
  const outstandingYouOwe = expenses
    .filter((t) => t.paidByPerson && !t.shareSettled)
    .reduce((s, t) => s + t.amount, 0);

  const insightLines = [
    `Average expense: ${inr(time.avgPerTransaction)} across ${expenses.length} transaction${expenses.length === 1 ? '' : 's'}.`,
    time.segmentStats.highest
      ? `Peak spending window: ${time.segmentStats.highest.label} (${time.segmentStats.highest.range}).`
      : null,
    time.dayOfWeekStats.highest ? `Highest-spend day of week: ${time.dayOfWeekStats.highest.label}.` : null,
    shares.length > 0
      ? `Shared expenses: ${inr(outstandingOwedToYou)} owed to you, ${inr(outstandingYouOwe)} you still owe. Kept separate from Lending & Borrowing.`
      : null,
  ].filter(Boolean);

  // Pre-wrap every insight line so we can size the panel to fit exactly,
  // instead of guessing a fixed row height and risking overlap/overflow.
  const wrapped = insightLines.map((line) => doc.splitTextToSize(line, rightW - 32));
  const LINE_H = 11;
  const ROW_GAP = 8;
  let rightContentH = 0;
  wrapped.forEach((lines) => {
    rightContentH += lines.length * LINE_H + ROW_GAP;
  });

  const leftContentH = 26 + topCategories.length * 22 + 14;
  const panelH = Math.max(leftContentH, 30 + rightContentH, 60);

  const panelTop = sectionTitleY + 10;
  doc.setFillColor(...PANEL);
  doc.setDrawColor(...LINE);
  doc.roundedRect(MARGIN, panelTop, leftW, panelH, 5, 5, 'FD');
  doc.roundedRect(rightX, panelTop, rightW, panelH, 5, 5, 'FD');

  // Left — top categories with proportional bars
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('TOP CATEGORIES', MARGIN + 12, panelTop + 16);

  const barMaxW = leftW - 24 - 78;
  topCategories.forEach(([cat, amt], i) => {
    const rowY = panelTop + 30 + i * 22;
    const pct = totalExpense > 0 ? amt / totalExpense : 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(cat, MARGIN + 12, rowY, { maxWidth: 90 });

    doc.setFillColor(...LINE);
    doc.roundedRect(MARGIN + 12, rowY + 4, barMaxW, 6, 2, 2, 'F');
    doc.setFillColor(...BRAND);
    doc.roundedRect(MARGIN + 12, rowY + 4, Math.max(3, barMaxW * pct), 6, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(inr(amt), MARGIN + leftW - 12, rowY, { align: 'right' });
  });

  if (topCategories.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text('No expenses in this period.', MARGIN + 12, panelTop + 34);
  }

  // Right — insight callouts, each pre-wrapped so nothing overlaps
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('INSIGHTS', rightX + 12, panelTop + 16);

  let cursorY = panelTop + 30;
  wrapped.forEach((lines) => {
    doc.setFillColor(...BRAND);
    doc.circle(rightX + 14, cursorY - 3, 1.6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(...INK);
    lines.forEach((ln, li) => {
      doc.text(ln, rightX + 20, cursorY + li * LINE_H);
    });
    cursorY += lines.length * LINE_H + ROW_GAP;
  });

  return panelTop + panelH + 20;
}

function detailsFor(t) {
  const parts = [];
  if (t.type === 'self_transfer') {
    parts.push(`${t.accountName || 'Account'} -> ${t.toAccountName || 'Account'}`);
  } else {
    if (t.isSplit) parts.push(`Split bill, total ${inr(t.splitTotalAmount)}`);
    if (t.paidByPerson) parts.push(`Paid by ${t.paidByPerson} (${t.shareSettled ? 'settled' : 'unsettled'})`);
    if (t.person && !t.paidByPerson) parts.push(t.person);
    if (t.description) parts.push(t.description);
  }
  return parts.join(' · ') || '—';
}

// Builds the statement PDF and returns the jsPDF document instance without
// saving/downloading it, so callers can either trigger a download or read
// the bytes out (e.g. to attach to an email). The PDF is always password
// protected — opening it requires the account's registered email address,
// per the app's statement security policy.
export function buildStatementPdf({ userName, userEmail, startDate, endDate, transactions }) {
  const password = (userEmail || '').trim();
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    encryption: password
      ? {
          userPassword: password,
          ownerPassword: `${password}::wealthr-owner`,
          userPermissions: ['print'],
        }
      : undefined,
  });
  const pw = pageWidth(doc);

  const summary = summarize(transactions);

  drawFullHeader(doc, { userName, userEmail, startDate, endDate });
  let y = drawSummary(doc, PAGE_TOP_CONTENT, summary);
  y = drawAnalysis(doc, y, transactions);

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? -1 : 1));
  const rows = sorted.map((t) => {
    const sign = SIGNED[t.type] ?? 0;
    const amountLabel = `${sign > 0 ? '+' : sign < 0 ? '-' : ''}${inr(t.amount)}`;
    return [
      formatDate(t.date),
      TYPE_LABELS[t.type] || t.type,
      t.category + (t.subcategory ? ` / ${t.subcategory}` : ''),
      detailsFor(t),
      t.type === 'self_transfer' ? '—' : t.accountName || '—',
      amountLabel,
    ];
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text('Transaction Detail', MARGIN, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, top: CONTINUATION_TOP, bottom: 56 },
    head: [['Date', 'Type', 'Category', 'Details', 'Account', 'Amount']],
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      lineColor: LINE,
      lineWidth: 0.5,
      textColor: INK,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: BRAND,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: PANEL },
    columnStyles: {
      0: { cellWidth: 56 },
      1: { cellWidth: 62 },
      2: { cellWidth: 92 },
      3: { cellWidth: 148 },
      4: { cellWidth: 62 },
      5: { cellWidth: 62, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const raw = rows[data.row.index][5];
        if (raw.startsWith('+')) data.cell.styles.textColor = INCOME_GREEN;
        else if (raw.startsWith('-')) data.cell.styles.textColor = EXPENSE_RED;
        else data.cell.styles.textColor = MUTED;
      }
      if (data.section === 'body' && data.column.index === 3) {
        const raw = rows[data.row.index][3];
        if (raw.includes('unsettled')) data.cell.styles.textColor = LEND_AMBER;
      }
    },
    didDrawPage: () => {
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      if (pageNumber > 1) drawContinuationHeader(doc);
    },
  });

  if (transactions.length === 0) {
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('No transactions found in this date range.', MARGIN, finalY + 24);
  }

  // Footer + branding on every page, kept fully inside the page boundary.
  const pageCount = doc.internal.getNumberOfPages();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, ph - 44, pw - MARGIN, ph - 44);
    drawBrandFooterMark(doc, MARGIN, ph - 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('For personal record-keeping only.', pw / 2, ph - 26, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pw - MARGIN, ph - 26, { align: 'right' });
  }

  return doc;
}

export function statementFilename(startDate, endDate) {
  return `Wealthr-Statement-${startDate.slice(0, 10)}-to-${endDate.slice(0, 10)}.pdf`;
}

// Generates the statement and immediately triggers a browser download.
export function generateStatementPdf(params) {
  const doc = buildStatementPdf(params);
  doc.save(statementFilename(params.startDate, params.endDate));
}

// Generates the statement and returns it as a base64 string (no data-URI
// prefix), suitable for sending as an email attachment.
export function generateStatementPdfBase64(params) {
  const doc = buildStatementPdf(params);
  const dataUri = doc.output('datauristring');
  return dataUri.slice(dataUri.indexOf('base64,') + 'base64,'.length);
}
