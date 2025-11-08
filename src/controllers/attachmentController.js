const Attachment = require('../models/Attachment');
const fs = require('fs').promises;

class AttachmentController {
  // Upload attachment
  static async uploadAttachment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const ticketId = parseInt(req.params.ticketId);
      const userId = parseInt(req.body.user_id);

      const attachment = await Attachment.create(ticketId, userId, req.file);

      res.status(201).json({
        success: true,
        message: 'Attachment uploaded successfully',
        data: attachment,
      });
    } catch (error) {
      console.error('Error uploading attachment:', error);
      // Clean up uploaded file if database insert fails
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      res.status(500).json({
        success: false,
        message: 'Failed to upload attachment',
        error: error.message,
      });
    }
  }

  // Get attachments for a ticket
  static async getTicketAttachments(req, res) {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const attachments = await Attachment.getByTicketId(ticketId);

      res.json({
        success: true,
        count: attachments.length,
        data: attachments,
      });
    } catch (error) {
      console.error('Error fetching attachments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attachments',
        error: error.message,
      });
    }
  }

  // Get attachment metadata
  static async getAttachmentMetadata(req, res) {
    try {
      const attachmentId = parseInt(req.params.id);
      const metadata = await Attachment.getMetadata(attachmentId);

      if (!metadata) {
        return res.status(404).json({
          success: false,
          message: 'Attachment not found',
        });
      }

      res.json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      console.error('Error fetching attachment metadata:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attachment metadata',
        error: error.message,
      });
    }
  }

  // Download attachment
  static async downloadAttachment(req, res) {
    try {
      const attachmentId = parseInt(req.params.id);
      const attachment = await Attachment.getById(attachmentId);

      if (!attachment) {
        return res.status(404).json({
          success: false,
          message: 'Attachment not found',
        });
      }

      res.download(attachment.file_path, attachment.file_name);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download attachment',
        error: error.message,
      });
    }
  }

  // Delete attachment
  static async deleteAttachment(req, res) {
    try {
      const attachmentId = parseInt(req.params.id);
      const userId = parseInt(req.body.user_id);

      const attachment = await Attachment.delete(attachmentId, userId);

      // Delete physical file
      try {
        await fs.unlink(attachment.file_path);
      } catch (unlinkError) {
        console.error('Error deleting physical file:', unlinkError);
      }

      res.json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete attachment',
        error: error.message,
      });
    }
  }

  // Get storage statistics
  static async getStorageStatistics(req, res) {
    try {
      const stats = await Attachment.getStorageStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching storage statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch storage statistics',
        error: error.message,
      });
    }
  }
}

module.exports = AttachmentController;
