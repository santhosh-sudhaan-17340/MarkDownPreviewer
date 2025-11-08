const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  // Compile template with data
  compileTemplate(template, data) {
    const compiled = handlebars.compile(template);
    return compiled(data);
  }

  // Send email
  async sendEmail({ to, subject, html, text }) {
    try {
      if (!process.env.SMTP_USER) {
        console.log('Email service not configured. Would send:', { to, subject });
        return { success: false, message: 'SMTP not configured' };
      }

      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text
      });

      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send ticket created notification
  async sendTicketCreatedEmail(ticket, customer) {
    const template = `
      <h2>Ticket Created: #{{ticket_number}}</h2>
      <p>Hello {{customer_name}},</p>
      <p>Your support ticket has been created successfully.</p>
      <h3>Ticket Details:</h3>
      <ul>
        <li><strong>Ticket Number:</strong> {{ticket_number}}</li>
        <li><strong>Subject:</strong> {{subject}}</li>
        <li><strong>Priority:</strong> {{priority}}</li>
        <li><strong>Status:</strong> {{status}}</li>
      </ul>
      <p>We will respond to your ticket as soon as possible.</p>
      <p>Best regards,<br>Support Team</p>
    `;

    const html = this.compileTemplate(template, {
      ticket_number: ticket.ticket_number,
      customer_name: customer.full_name,
      subject: ticket.subject,
      priority: ticket.priority,
      status: ticket.status
    });

    return await this.sendEmail({
      to: customer.email,
      subject: `Ticket #${ticket.ticket_number} Created`,
      html
    });
  }

  // Send ticket assigned notification
  async sendTicketAssignedEmail(ticket, agent) {
    const template = `
      <h2>Ticket Assigned: #{{ticket_number}}</h2>
      <p>Hello {{agent_name}},</p>
      <p>A new ticket has been assigned to you.</p>
      <h3>Ticket Details:</h3>
      <ul>
        <li><strong>Ticket Number:</strong> {{ticket_number}}</li>
        <li><strong>Subject:</strong> {{subject}}</li>
        <li><strong>Priority:</strong> <span style="color: {{priority_color}}">{{priority}}</span></li>
        <li><strong>Due Date:</strong> {{due_date}}</li>
      </ul>
      <p>Please review and respond at your earliest convenience.</p>
      <p><a href="{{ticket_url}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket</a></p>
    `;

    const priorityColors = {
      critical: '#d32f2f',
      high: '#f57c00',
      medium: '#fbc02d',
      low: '#388e3c'
    };

    const html = this.compileTemplate(template, {
      agent_name: agent.full_name,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      priority: ticket.priority,
      priority_color: priorityColors[ticket.priority] || '#000',
      due_date: ticket.due_date ? new Date(ticket.due_date).toLocaleString() : 'Not set',
      ticket_url: `${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticket.id}`
    });

    return await this.sendEmail({
      to: agent.email,
      subject: `Ticket #${ticket.ticket_number} Assigned to You`,
      html
    });
  }

  // Send SLA breach alert
  async sendSLABreachEmail(ticket, recipients) {
    const template = `
      <h2 style="color: #d32f2f;">⚠️ SLA BREACH ALERT</h2>
      <p><strong>Ticket #{{ticket_number}} has breached SLA!</strong></p>
      <h3>Ticket Details:</h3>
      <ul>
        <li><strong>Subject:</strong> {{subject}}</li>
        <li><strong>Priority:</strong> <span style="color: red">{{priority}}</span></li>
        <li><strong>Assigned To:</strong> {{agent_name}}</li>
        <li><strong>Due Date:</strong> {{due_date}}</li>
        <li><strong>Hours Overdue:</strong> <span style="color: red">{{hours_overdue}}</span></li>
      </ul>
      <p style="color: red; font-weight: bold;">IMMEDIATE ACTION REQUIRED</p>
      <p><a href="{{ticket_url}}" style="background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket Now</a></p>
    `;

    const hoursOverdue = ticket.due_date
      ? ((new Date() - new Date(ticket.due_date)) / (1000 * 60 * 60)).toFixed(1)
      : 0;

    const html = this.compileTemplate(template, {
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      priority: ticket.priority,
      agent_name: ticket.assignedAgent?.full_name || 'Unassigned',
      due_date: ticket.due_date ? new Date(ticket.due_date).toLocaleString() : 'Not set',
      hours_overdue: hoursOverdue,
      ticket_url: `${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticket.id}`
    });

    const emailPromises = recipients.map(recipient =>
      this.sendEmail({
        to: recipient.email,
        subject: `🚨 SLA BREACH: Ticket #${ticket.ticket_number}`,
        html
      })
    );

    return await Promise.all(emailPromises);
  }

  // Send ticket escalated notification
  async sendTicketEscalatedEmail(ticket, recipient, escalationReason) {
    const template = `
      <h2>Ticket Escalated: #{{ticket_number}}</h2>
      <p>Hello {{recipient_name}},</p>
      <p>A ticket has been escalated to you.</p>
      <h3>Ticket Details:</h3>
      <ul>
        <li><strong>Ticket Number:</strong> {{ticket_number}}</li>
        <li><strong>Subject:</strong> {{subject}}</li>
        <li><strong>Priority:</strong> {{priority}}</li>
        <li><strong>Escalation Reason:</strong> {{reason}}</li>
      </ul>
      <p><strong>Please review this ticket immediately.</strong></p>
      <p><a href="{{ticket_url}}" style="background-color: #f57c00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket</a></p>
    `;

    const html = this.compileTemplate(template, {
      recipient_name: recipient.full_name,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      priority: ticket.priority,
      reason: escalationReason,
      ticket_url: `${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticket.id}`
    });

    return await this.sendEmail({
      to: recipient.email,
      subject: `Ticket #${ticket.ticket_number} Escalated`,
      html
    });
  }

  // Send status change notification
  async sendStatusChangeEmail(ticket, customer, oldStatus, newStatus) {
    const template = `
      <h2>Ticket Status Updated: #{{ticket_number}}</h2>
      <p>Hello {{customer_name}},</p>
      <p>Your ticket status has been updated.</p>
      <h3>Status Change:</h3>
      <p><strong>{{old_status}}</strong> → <strong>{{new_status}}</strong></p>
      <h3>Ticket Details:</h3>
      <ul>
        <li><strong>Subject:</strong> {{subject}}</li>
        <li><strong>Priority:</strong> {{priority}}</li>
      </ul>
      <p><a href="{{ticket_url}}">View Ticket Details</a></p>
      <p>Best regards,<br>Support Team</p>
    `;

    const html = this.compileTemplate(template, {
      customer_name: customer.full_name,
      ticket_number: ticket.ticket_number,
      old_status: oldStatus,
      new_status: newStatus,
      subject: ticket.subject,
      priority: ticket.priority,
      ticket_url: `${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticket.id}`
    });

    return await this.sendEmail({
      to: customer.email,
      subject: `Ticket #${ticket.ticket_number} Status Updated`,
      html
    });
  }

  // Send generic notification email
  async sendNotificationEmail(to, title, message, ticketId = null) {
    const template = `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      {{#if ticket_url}}
      <p><a href="{{ticket_url}}">View Ticket</a></p>
      {{/if}}
    `;

    const html = this.compileTemplate(template, {
      title,
      message,
      ticket_url: ticketId ? `${process.env.APP_URL || 'http://localhost:3000'}/tickets/${ticketId}` : null
    });

    return await this.sendEmail({
      to,
      subject: title,
      html
    });
  }
}

module.exports = new EmailService();
