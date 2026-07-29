const PDFDocument = require('pdfkit');

const MAX_ROW_HEIGHT = 42;
const MIN_ROW_HEIGHT = 18;
const CHAR_W = 4.5;

function truncateText(text, maxWidth) {
  const s = String(text ?? '');
  const avgChars = Math.floor(maxWidth / CHAR_W);
  if (s.length <= avgChars) return s;
  return s.slice(0, Math.max(avgChars - 2, 1)) + '…';
}

function generatePDF({ title, subtitle, headers, rows, dateRange, generatedBy }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100;
    const primaryColor = '#F97316';
    const headerBg = '#1a1a2e';
    const altRowColor = '#f8f6fc';
    const borderColor = '#e2dff0';
    const baseFontSize = 8;

    const addHeader = () => {
      doc.fontSize(22).font('Helvetica-Bold').fillColor(headerBg)
        .text('Rent Bike Cox\'s Bazar', 50, 45, { width: pageWidth });
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
        .text('Cox\'s Bazar, Bangladesh | 01891154443 | 01764466757', 50, 70, { width: pageWidth });
      doc.moveTo(50, 90).lineTo(doc.page.width - 50, 90).strokeColor(primaryColor).lineWidth(2).stroke();
    };

    const addFooter = () => {
      const footerY = doc.page.height - 50;
      doc.fontSize(7).fillColor('#9ca3af');
      doc.text(
        `Page ${doc.bufferedPageRange().count || 1} | Generated: ${new Date().toLocaleString('en-BD')}${generatedBy ? ` | By: ${generatedBy}` : ''}`,
        50, footerY, { width: pageWidth, align: 'center' }
      );
    };

    const addTableHeader = (yPos) => {
      const colWidth = pageWidth / headers.length;
      doc.font('Helvetica-Bold').fontSize(baseFontSize).fillColor('#ffffff');
      headers.forEach((h, i) => {
        doc.rect(50 + i * colWidth, yPos, colWidth, 20).fill(headerBg);
        doc.fillColor('#ffffff').text(h, 50 + i * colWidth + 4, yPos + 5, { width: colWidth - 8, align: i === 0 ? 'left' : 'right' });
      });
      return yPos + 20;
    };

    const calcRowHeight = (row) => {
      const colWidth = pageWidth / headers.length;
      doc.font('Helvetica').fontSize(baseFontSize);
      let maxH = MIN_ROW_HEIGHT;
      row.forEach((cell, ci) => {
        const w = colWidth - 8;
        const text = String(cell ?? '');
        const truncated = truncateText(text, w);
        const h = doc.heightOfString(truncated, { width: w });
        maxH = Math.max(maxH, Math.min(h + 4, MAX_ROW_HEIGHT));
      });
      return maxH;
    };

    const drawRow = (row, rowIndex) => {
      const colWidth = pageWidth / headers.length;
      const rowH = calcRowHeight(row);

      if (y + rowH + 20 > doc.page.height - 50) {
        addFooter();
        doc.addPage();
        addHeader();
        y = 110;
        y = addTableHeader(y);
      }

      const bgColor = rowIndex % 2 === 1 ? altRowColor : '#ffffff';
      doc.rect(50, y, pageWidth, rowH).fill(bgColor);

      doc.font('Helvetica').fontSize(baseFontSize).fillColor('#374151');
      row.forEach((cell, ci) => {
        const align = ci === 0 ? 'left' : 'right';
        const w = colWidth - 8;
        const text = truncateText(String(cell ?? ''), w);
        doc.text(text, 50 + ci * colWidth + 4, y + 2, { width: w, align });
      });

      y += rowH;
    };

    addHeader();

    let y = 110;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(headerBg)
      .text(title, 50, y, { width: pageWidth });
    y += 24;
    if (subtitle) {
      doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(subtitle, 50, y, { width: pageWidth });
      y += 18;
    }
    if (dateRange) {
      doc.fontSize(9).fillColor('#9ca3af')
        .text(`Period: ${dateRange.start} — ${dateRange.end}`, 50, y, { width: pageWidth });
      y += 18;
    }

    y += 8;

    if (headers.length && rows.length) {
      y = addTableHeader(y);
      rows.forEach(drawRow);
    }

    if (rows.length) {
      y += 10;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(borderColor).lineWidth(1).stroke();
      y += 10;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(headerBg)
        .text(`Total Records: ${rows.length}`, 50, y, { width: pageWidth });
    }

    addFooter();
    doc.end();
  });
}

module.exports = { generatePDF };
