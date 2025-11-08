const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ExportService {

  // Export tickets to Excel
  static async exportTicketsToExcel(tickets) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tickets');

    // Define columns
    worksheet.columns = [
      { header: 'Ticket Number', key: 'ticket_number', width: 15 },
      { header: 'Subject', key: 'subject', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Assigned Agent', key: 'agent', width: 25 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Due Date', key: 'due_date', width: 20 },
      { header: 'SLA Breached', key: 'sla_breached', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };

    // Add data rows
    tickets.forEach(ticket => {
      const row = worksheet.addRow({
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category || 'N/A',
        customer: ticket.customer?.full_name || 'N/A',
        agent: ticket.assignedAgent?.full_name || 'Unassigned',
        created_at: ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '',
        due_date: ticket.due_date ? new Date(ticket.due_date).toLocaleString() : '',
        sla_breached: ticket.is_sla_breached ? 'Yes' : 'No'
      });

      // Color code priority
      if (ticket.priority === 'critical') {
        row.getCell('priority').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' }
        };
      } else if (ticket.priority === 'high') {
        row.getCell('priority').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA500' }
        };
      }

      // Color code SLA breach
      if (ticket.is_sla_breached) {
        row.getCell('sla_breached').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' }
        };
        row.getCell('sla_breached').font = { color: { argb: 'FFFFFFFF' }, bold: true };
      }
    });

    // Generate buffer
    return await workbook.xlsx.writeBuffer();
  }

  // Export analytics to Excel
  static async exportAnalyticsToExcel(analytics) {
    const workbook = new ExcelJS.Workbook();

    // Backlog worksheet
    if (analytics.backlog) {
      const backlogSheet = workbook.addWorksheet('Backlog');
      backlogSheet.columns = [
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Count', key: 'count', width: 10 },
        { header: 'SLA Breached', key: 'breached', width: 15 }
      ];

      backlogSheet.getRow(1).font = { bold: true };
      analytics.backlog.byStatus?.forEach(item => {
        backlogSheet.addRow({
          status: item.status,
          count: item.ticket_count,
          breached: item.breached_count
        });
      });
    }

    // Agent productivity worksheet
    if (analytics.productivity) {
      const prodSheet = workbook.addWorksheet('Agent Productivity');
      prodSheet.columns = [
        { header: 'Agent', key: 'agent', width: 25 },
        { header: 'Total Handled', key: 'total', width: 15 },
        { header: 'Resolved', key: 'resolved', width: 12 },
        { header: 'Active', key: 'active', width: 12 },
        { header: 'Avg Resolution (hrs)', key: 'avg_resolution', width: 20 },
        { header: 'SLA Compliance %', key: 'compliance', width: 18 }
      ];

      prodSheet.getRow(1).font = { bold: true };
      analytics.productivity.productivity?.forEach(agent => {
        prodSheet.addRow({
          agent: agent.agent_name,
          total: agent.total_tickets_handled,
          resolved: agent.resolved_tickets,
          active: agent.active_tickets,
          avg_resolution: agent.avg_resolution_time_hours ? parseFloat(agent.avg_resolution_time_hours).toFixed(2) : 'N/A',
          compliance: agent.sla_compliance_rate || 0
        });
      });
    }

    return await workbook.xlsx.writeBuffer();
  }

  // Export tickets to PDF
  static async exportTicketsToPDF(tickets) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text('Ticket Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Summary
      doc.fontSize(14).text(`Total Tickets: ${tickets.length}`, { underline: true });
      doc.moveDown();

      // Tickets
      tickets.forEach((ticket, index) => {
        if (index > 0) doc.moveDown();

        doc.fontSize(12).fillColor('#000000');
        doc.text(`Ticket #${ticket.ticket_number}`, { bold: true });
        doc.fontSize(10);
        doc.text(`Subject: ${ticket.subject}`);
        doc.text(`Status: ${ticket.status} | Priority: ${ticket.priority}`);
        doc.text(`Customer: ${ticket.customer?.full_name || 'N/A'}`);
        doc.text(`Agent: ${ticket.assignedAgent?.full_name || 'Unassigned'}`);
        doc.text(`Created: ${new Date(ticket.created_at).toLocaleString()}`);

        if (ticket.is_sla_breached) {
          doc.fillColor('#FF0000').text('⚠️ SLA BREACHED', { continued: false });
          doc.fillColor('#000000');
        }

        doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
        doc.moveDown();

        // Page break if needed
        if (doc.y > 700 && index < tickets.length - 1) {
          doc.addPage();
        }
      });

      doc.end();
    });
  }

  // Export single ticket detail to PDF
  static async exportTicketDetailToPDF(ticket) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).text(`Ticket #${ticket.ticket_number}`, { align: 'center' });
      doc.moveDown(2);

      // Details
      doc.fontSize(14).text('Ticket Details', { underline: true });
      doc.moveDown();

      doc.fontSize(11);
      doc.text(`Subject: ${ticket.subject}`, { bold: true });
      doc.moveDown(0.5);
      doc.text(`Description: ${ticket.description}`);
      doc.moveDown();

      doc.text(`Status: ${ticket.status}`);
      doc.text(`Priority: ${ticket.priority}`);
      doc.text(`Category: ${ticket.category || 'N/A'}`);
      doc.moveDown();

      doc.text(`Customer: ${ticket.customer?.full_name || 'N/A'} (${ticket.customer?.email || 'N/A'})`);
      doc.text(`Assigned Agent: ${ticket.assignedAgent?.full_name || 'Unassigned'}`);
      doc.moveDown();

      doc.text(`Created: ${new Date(ticket.created_at).toLocaleString()}`);
      doc.text(`Due Date: ${ticket.due_date ? new Date(ticket.due_date).toLocaleString() : 'N/A'}`);

      if (ticket.is_sla_breached) {
        doc.moveDown();
        doc.fillColor('#FF0000').fontSize(12).text('⚠️ SLA BREACHED', { bold: true });
        doc.fillColor('#000000').fontSize(11);
      }

      // Comments
      if (ticket.TicketComments && ticket.TicketComments.length > 0) {
        doc.addPage();
        doc.fontSize(14).text('Comments', { underline: true });
        doc.moveDown();

        ticket.TicketComments.forEach(comment => {
          doc.fontSize(10);
          doc.text(`${comment.User?.full_name || 'System'} - ${new Date(comment.created_at).toLocaleString()}`);
          doc.fontSize(11).text(comment.comment);
          doc.moveDown();
        });
      }

      doc.end();
    });
  }
}

module.exports = ExportService;
