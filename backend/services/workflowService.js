const { Workflow } = require('../models');
const NotificationService = require('./notificationService');
const emailService = require('./emailService');
const webhookService = require('./webhookService');
const { Op } = require('sequelize');

class WorkflowService {

  // Execute workflows based on trigger
  static async executeWorkflows(triggerType, context) {
    try {
      const workflows = await Workflow.findAll({
        where: {
          trigger_type: triggerType,
          is_active: true
        },
        order: [['execution_order', 'ASC']]
      });

      for (const workflow of workflows) {
        if (this.checkConditions(workflow.trigger_conditions, context)) {
          await this.executeActions(workflow.actions, context, workflow.id);
        }
      }
    } catch (error) {
      console.error('Error executing workflows:', error);
    }
  }

  // Check if conditions match
  static checkConditions(conditions, context) {
    if (!conditions) return true;

    // Example condition: { "field": "priority", "operator": "equals", "value": "critical" }
    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(context, condition.field);

      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return false;
          break;
        case 'not_equals':
          if (fieldValue === condition.value) return false;
          break;
        case 'contains':
          if (!fieldValue || !fieldValue.includes(condition.value)) return false;
          break;
        case 'greater_than':
          if (fieldValue <= condition.value) return false;
          break;
        case 'less_than':
          if (fieldValue >= condition.value) return false;
          break;
        default:
          return true;
      }
    }

    return true;
  }

  // Execute workflow actions
  static async executeActions(actions, context, workflowId) {
    try {
      for (const action of actions) {
        switch (action.type) {
          case 'send_email':
            await this.sendEmailAction(action.params, context);
            break;
          case 'send_notification':
            await this.sendNotificationAction(action.params, context);
            break;
          case 'update_ticket':
            await this.updateTicketAction(action.params, context);
            break;
          case 'assign_ticket':
            await this.assignTicketAction(action.params, context);
            break;
          case 'add_comment':
            await this.addCommentAction(action.params, context);
            break;
          case 'trigger_webhook':
            await this.triggerWebhookAction(action.params, context);
            break;
          case 'escalate_ticket':
            await this.escalateTicketAction(action.params, context);
            break;
          default:
            console.log(`Unknown action type: ${action.type}`);
        }
      }

      // Log successful execution
      console.log(`Workflow ${workflowId} executed successfully`);
    } catch (error) {
      console.error(`Error executing workflow ${workflowId}:`, error);
    }
  }

  // Action: Send email
  static async sendEmailAction(params, context) {
    const { to, subject, body } = params;
    const compiledSubject = this.replaceVariables(subject, context);
    const compiledBody = this.replaceVariables(body, context);

    await emailService.sendEmail({
      to: this.replaceVariables(to, context),
      subject: compiledSubject,
      html: compiledBody
    });
  }

  // Action: Send notification
  static async sendNotificationAction(params, context) {
    const { user_id, title, message } = params;

    await NotificationService.createNotification({
      userId: this.replaceVariables(user_id, context),
      ticketId: context.ticket?.id,
      type: 'workflow',
      title: this.replaceVariables(title, context),
      message: this.replaceVariables(message, context)
    });
  }

  // Action: Update ticket
  static async updateTicketAction(params, context) {
    if (context.ticket) {
      await context.ticket.update(params);
    }
  }

  // Action: Assign ticket
  static async assignTicketAction(params, context) {
    if (context.ticket) {
      await context.ticket.update({
        assigned_agent_id: params.agent_id,
        status: 'assigned'
      });
    }
  }

  // Action: Add comment
  static async addCommentAction(params, context) {
    if (context.ticket) {
      const { TicketComment } = require('../models');
      await TicketComment.create({
        ticket_id: context.ticket.id,
        user_id: params.user_id || null,
        comment: this.replaceVariables(params.comment, context),
        is_internal: params.is_internal || true
      });
    }
  }

  // Action: Trigger webhook
  static async triggerWebhookAction(params, context) {
    await webhookService.triggerWebhooks(params.event_type, context);
  }

  // Action: Escalate ticket
  static async escalateTicketAction(params, context) {
    if (context.ticket) {
      const { TicketEscalation } = require('../models');
      await TicketEscalation.create({
        ticket_id: context.ticket.id,
        escalated_from: context.ticket.assigned_agent_id,
        escalated_to: params.escalate_to,
        escalation_reason: this.replaceVariables(params.reason, context),
        is_auto_escalated: true
      });

      await context.ticket.update({
        status: 'escalated',
        escalated_at: new Date()
      });
    }
  }

  // Replace variables in string
  static replaceVariables(template, context) {
    if (!template || typeof template !== 'string') return template;

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      return this.getNestedValue(context, path) || match;
    });
  }

  // Get nested value from object
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}

module.exports = WorkflowService;
