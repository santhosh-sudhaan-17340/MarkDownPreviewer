const User = require('./User');
const Skill = require('./Skill');
const UserSkill = require('./UserSkill');
const SlaPolicy = require('./SlaPolicy');
const Ticket = require('./Ticket');
const TicketStatusHistory = require('./TicketStatusHistory');
const TicketAssignment = require('./TicketAssignment');
const TicketEscalation = require('./TicketEscalation');
const Attachment = require('./Attachment');
const AuditLog = require('./AuditLog');
const TicketComment = require('./TicketComment');

// Define associations

// User associations
User.belongsToMany(Skill, { through: UserSkill, foreignKey: 'user_id' });
Skill.belongsToMany(User, { through: UserSkill, foreignKey: 'skill_id' });

User.hasMany(Ticket, { as: 'submittedTickets', foreignKey: 'customer_id' });
User.hasMany(Ticket, { as: 'assignedTickets', foreignKey: 'assigned_agent_id' });

// Ticket associations
Ticket.belongsTo(User, { as: 'customer', foreignKey: 'customer_id' });
Ticket.belongsTo(User, { as: 'assignedAgent', foreignKey: 'assigned_agent_id' });
Ticket.belongsTo(Skill, { foreignKey: 'skill_id' });
Ticket.belongsTo(SlaPolicy, { foreignKey: 'sla_policy_id' });

Ticket.hasMany(TicketStatusHistory, { foreignKey: 'ticket_id' });
Ticket.hasMany(TicketAssignment, { foreignKey: 'ticket_id' });
Ticket.hasMany(TicketEscalation, { foreignKey: 'ticket_id' });
Ticket.hasMany(Attachment, { foreignKey: 'ticket_id' });
Ticket.hasMany(AuditLog, { foreignKey: 'ticket_id' });
Ticket.hasMany(TicketComment, { foreignKey: 'ticket_id' });

// Status history associations
TicketStatusHistory.belongsTo(Ticket, { foreignKey: 'ticket_id' });
TicketStatusHistory.belongsTo(User, { as: 'changedBy', foreignKey: 'changed_by' });

// Assignment associations
TicketAssignment.belongsTo(Ticket, { foreignKey: 'ticket_id' });
TicketAssignment.belongsTo(User, { as: 'assignedToUser', foreignKey: 'assigned_to' });
TicketAssignment.belongsTo(User, { as: 'assignedByUser', foreignKey: 'assigned_by' });

// Escalation associations
TicketEscalation.belongsTo(Ticket, { foreignKey: 'ticket_id' });
TicketEscalation.belongsTo(User, { as: 'escalatedFromUser', foreignKey: 'escalated_from' });
TicketEscalation.belongsTo(User, { as: 'escalatedToUser', foreignKey: 'escalated_to' });

// Attachment associations
Attachment.belongsTo(Ticket, { foreignKey: 'ticket_id' });
Attachment.belongsTo(User, { as: 'uploadedBy', foreignKey: 'uploaded_by' });

// Audit log associations
AuditLog.belongsTo(Ticket, { foreignKey: 'ticket_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

// Comment associations
TicketComment.belongsTo(Ticket, { foreignKey: 'ticket_id' });
TicketComment.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User,
  Skill,
  UserSkill,
  SlaPolicy,
  Ticket,
  TicketStatusHistory,
  TicketAssignment,
  TicketEscalation,
  Attachment,
  AuditLog,
  TicketComment
};
