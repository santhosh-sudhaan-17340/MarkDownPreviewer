import { TicketStatus, TicketPriority, UserRole } from '@prisma/client';

export interface CreateTicketDto {
  title: string;
  description: string;
  priority: TicketPriority;
  requiredSkillId?: string;
  createdById: string;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: string;
}

export interface AddCommentDto {
  ticketId: string;
  userId: string;
  content: string;
  isInternal?: boolean;
}

export interface CreateUserDto {
  email: string;
  name: string;
  role: UserRole;
  skillIds?: string[];
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: string;
  createdById?: string;
  requiredSkillId?: string;
  responseSLAStatus?: string;
  resolutionSLAStatus?: string;
}

export interface AuditLogEntry {
  ticketId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}
