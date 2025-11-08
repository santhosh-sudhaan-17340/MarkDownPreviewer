const { query, transaction } = require('../database/connection');
const crypto = require('crypto');

class Attachment {
  // Create file hash for deduplication and integrity
  static generateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  // Add attachment to ticket
  static async create(ticketId, userId, fileData) {
    return transaction(async (client) => {
      const fileHash = this.generateFileHash(fileData.buffer);

      const query_text = `
        INSERT INTO ticket_attachments (
          ticket_id, uploaded_by_user_id, file_name, file_path,
          file_size, file_type, mime_type, file_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await client.query(query_text, [
        ticketId,
        userId,
        fileData.originalname,
        fileData.path,
        fileData.size,
        fileData.originalname.split('.').pop(),
        fileData.mimetype,
        fileHash,
      ]);

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_user_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'ticket_attachment',
          result.rows[0].id,
          'UPLOAD',
          userId,
          JSON.stringify({
            file_name: fileData.originalname,
            file_size: fileData.size,
            ticket_id: ticketId,
          }),
        ]
      );

      return result.rows[0];
    });
  }

  // Get attachments for a ticket
  static async getByTicketId(ticketId) {
    const query_text = `
      SELECT
        ta.*,
        u.full_name as uploaded_by_name,
        u.email as uploaded_by_email
      FROM ticket_attachments ta
      LEFT JOIN users u ON ta.uploaded_by_user_id = u.id
      WHERE ta.ticket_id = $1
      ORDER BY ta.uploaded_at DESC
    `;

    const result = await query(query_text, [ticketId]);
    return result.rows;
  }

  // Get attachment by ID
  static async getById(attachmentId) {
    const result = await query(
      'SELECT * FROM ticket_attachments WHERE id = $1',
      [attachmentId]
    );
    return result.rows[0];
  }

  // Get attachment metadata with statistics
  static async getMetadata(attachmentId) {
    const query_text = `
      SELECT
        ta.*,
        u.full_name as uploaded_by_name,
        u.email as uploaded_by_email,
        t.ticket_number,
        t.subject as ticket_subject,
        COUNT(*) OVER (PARTITION BY ta.ticket_id) as total_attachments_in_ticket,
        SUM(ta.file_size) OVER (PARTITION BY ta.ticket_id) as total_size_in_ticket
      FROM ticket_attachments ta
      LEFT JOIN users u ON ta.uploaded_by_user_id = u.id
      LEFT JOIN tickets t ON ta.ticket_id = t.id
      WHERE ta.id = $1
    `;

    const result = await query(query_text, [attachmentId]);
    return result.rows[0];
  }

  // Delete attachment
  static async delete(attachmentId, userId) {
    return transaction(async (client) => {
      const attachment = await client.query(
        'SELECT * FROM ticket_attachments WHERE id = $1',
        [attachmentId]
      );

      if (attachment.rows.length === 0) {
        throw new Error('Attachment not found');
      }

      await client.query('DELETE FROM ticket_attachments WHERE id = $1', [attachmentId]);

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_user_id, old_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'ticket_attachment',
          attachmentId,
          'DELETE',
          userId,
          JSON.stringify(attachment.rows[0]),
        ]
      );

      return attachment.rows[0];
    });
  }

  // Get storage statistics
  static async getStorageStatistics() {
    const query_text = `
      SELECT
        COUNT(*) as total_attachments,
        SUM(file_size) as total_storage_bytes,
        AVG(file_size) as avg_file_size,
        MAX(file_size) as max_file_size,
        COUNT(DISTINCT ticket_id) as tickets_with_attachments,
        COUNT(DISTINCT file_type) as unique_file_types,
        json_object_agg(file_type, type_count) as files_by_type
      FROM (
        SELECT
          file_type,
          file_size,
          ticket_id,
          COUNT(*) OVER (PARTITION BY file_type) as type_count
        FROM ticket_attachments
      ) subquery
    `;

    const result = await query(query_text, []);
    return result.rows[0];
  }
}

module.exports = Attachment;
