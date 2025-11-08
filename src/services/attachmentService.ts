import prisma from '../config/database';
import { AuditService } from './auditService';
import * as fs from 'fs';
import * as path from 'path';

export interface AttachmentMetadata {
  uploadedBy?: string;
  description?: string;
  tags?: string[];
  [key: string]: any;
}

export class AttachmentService {
  /**
   * Add attachment to ticket
   */
  static async addAttachment(
    ticketId: string,
    file: Express.Multer.File,
    metadata?: AttachmentMetadata
  ) {
    const attachment = await prisma.ticketAttachment.create({
      data: {
        ticketId,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        metadata: metadata || {},
      },
    });

    await AuditService.log({
      ticketId,
      userId: metadata?.uploadedBy,
      action: 'ATTACHMENT_ADDED',
      entityType: 'TicketAttachment',
      entityId: attachment.id,
      changes: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    return attachment;
  }

  /**
   * Get ticket attachments
   */
  static async getTicketAttachments(ticketId: string) {
    return await prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Get attachment by ID
   */
  static async getAttachment(attachmentId: string) {
    return await prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
    });
  }

  /**
   * Delete attachment
   */
  static async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Delete file from filesystem
    try {
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    await prisma.ticketAttachment.delete({
      where: { id: attachmentId },
    });

    await AuditService.log({
      ticketId: attachment.ticketId,
      userId,
      action: 'ATTACHMENT_DELETED',
      entityType: 'TicketAttachment',
      entityId: attachmentId,
      changes: { fileName: attachment.originalName },
    });

    return attachment;
  }

  /**
   * Get attachment metadata statistics
   */
  static async getAttachmentStats(ticketId?: string) {
    const where = ticketId ? { ticketId } : {};

    const stats = await prisma.ticketAttachment.aggregate({
      where,
      _count: { id: true },
      _sum: { fileSize: true },
      _avg: { fileSize: true },
    });

    const byMimeType = await prisma.ticketAttachment.groupBy({
      by: ['mimeType'],
      where,
      _count: { id: true },
      _sum: { fileSize: true },
    });

    return {
      totalAttachments: stats._count.id,
      totalSize: stats._sum.fileSize || 0,
      averageSize: stats._avg.fileSize || 0,
      byMimeType,
    };
  }
}
