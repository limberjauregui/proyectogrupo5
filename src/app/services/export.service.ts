import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import * as ExcelJS from 'exceljs';

export interface ExportOptions {
  filename: string;
  title?: string;
  company?: string;
  timestamp?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  /**
   * Exporta datos a PDF con formato profesional
   */
  async exportToPDF(
    data: any[],
    columns: { key: string; header: string; width?: number }[],
    options: ExportOptions
  ): Promise<void> {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPosition = margin;

    // Header
    if (options.company) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(options.company, margin, yPosition);
      yPosition += 8;
    }

    if (options.title) {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(options.title, margin, yPosition);
      yPosition += 12;
    }

    // Timestamp
    if (options.timestamp) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const timestamp = new Date().toLocaleString('es-PE');
      doc.text(`Generado: ${timestamp}`, margin, yPosition);
      yPosition += 6;
    }

    yPosition += 4;

    // Tabla
    const tableData = [
      columns.map(col => col.header),
      ...data.map(row =>
        columns.map(col => {
          const value = row[col.key];
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        })
      )
    ];

    (doc as any).autoTable({
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: yPosition,
      margin: margin,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: 'left'
      },
      headStyles: {
        fillColor: [20, 184, 166],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255]
      }
    });

    doc.save(options.filename);
  }

  /**
   * Exporta datos a Excel con múltiples hojas
   */
  async exportToExcel(
    sheets: {
      name: string;
      columns: { key: string; header: string; width?: number }[];
      data: any[];
      summary?: any;
    }[],
    options: ExportOptions
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    sheets.forEach(sheet => {
      const worksheet = workbook.addWorksheet(sheet.name);

      // Headers
      const headerRow = worksheet.addRow(sheet.columns.map(col => col.header));
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF14B8A6' }
      };

      // Set column widths
      sheet.columns.forEach((col, index) => {
        worksheet.getColumn(index + 1).width = col.width || 15;
      });

      // Data rows
      sheet.data.forEach(row => {
        worksheet.addRow(
          sheet.columns.map(col => {
            const value = row[col.key];
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
          })
        );
      });

      // Summary si existe
      if (sheet.summary) {
        worksheet.addRow([]); // Blank row
        Object.entries(sheet.summary).forEach(([key, value]) => {
          const summaryRow = worksheet.addRow([key, value]);
          summaryRow.font = { bold: true };
        });
      }

      // Borders
      worksheet.eachRow(row => {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    });

    // Title sheet
    const titleSheet = workbook.addWorksheet('Resumen', { properties: { tabColor: 'FF0000' } });
    const titleCell = titleSheet.addRow([options.title || 'Reporte'])[0];
    titleCell.font = { bold: true, size: 16 };

    if (options.timestamp) {
      titleSheet.addRow([`Fecha: ${new Date().toLocaleString('es-PE')}`]);
    }

    await workbook.xlsx.writeBuffer();
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Exporta a CSV
   */
  exportToCSV(
    data: any[],
    columns: { key: string; header: string }[],
    options: ExportOptions
  ): void {
    const headers = columns.map(col => col.header);
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        if (value === null || value === undefined) return '';
        return `"${String(value).replace(/"/g, '""')}"`;
      })
    );

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = options.filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Imprime un elemento HTML
   */
  printElement(elementId: string, title: string = 'Impresión'): void {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #14b8a6; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            h1 { color: #090f1d; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Fecha: ${new Date().toLocaleString('es-PE')}</p>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }
}
