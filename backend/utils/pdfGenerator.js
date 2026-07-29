const PDFDocument = require('pdfkit');

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

    const addTableHeader = (headers, y) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      const colWidth = pageWidth / headers.length;
      headers.forEach((h, i) => {
        doc.rect(50 + i * colWidth, y, colWidth, 20).fill(headerBg);
        doc.fillColor('#ffffff').text(h, 50 + i * colWidth + 4, y + 5, { width: colWidth - 8, align: i === 0 ? 'left' : 'right' });
      });
      return y + 20;
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
      const colWidth = pageWidth / headers.length;
      y = addTableHeader(headers, y);

      const drawRow = (row, rowIndex) => {
        if (y > doc.page.height - 80) {
          addFooter();
          doc.addPage();
          addHeader();
          y = 110;
          y = addTableHeader(headers, y);
        }
        const bgColor = rowIndex % 2 === 1 ? altRowColor : '#ffffff';
        doc.rect(50, y, pageWidth, 18).fill(bgColor);
        doc.font('Helvetica').fontSize(8).fillColor('#374151');
        row.forEach((cell, ci) => {
          const align = ci === 0 ? 'left' : 'right';
          doc.text(String(cell ?? ''), 50 + ci * colWidth + 4, y + 4, {
            width: colWidth - 8, align
          });
        });
        y += 18;
      };

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
