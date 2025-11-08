const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class AttachmentHandler {
    constructor() {
        this.uploadDir = process.env.UPLOAD_DIR || './uploads';
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB default
        this.allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-zip-compressed'
        ];
    }

    /**
     * Initialize upload directory
     */
    async initialize() {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log(`✓ Created upload directory: ${this.uploadDir}`);
        }
    }

    /**
     * Save attachment and create database record
     */
    async saveAttachment({
        ticketId,
        commentId = null,
        file,
        uploadedByAgentId = null,
        uploadedByUserId = null
    }) {
        // Validate file
        this.validateFile(file);

        // Generate unique filename
        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(this.uploadDir, uniqueFilename);

        // Calculate file checksum
        const checksum = await this.calculateChecksum(file.buffer || file.path);

        // Save file to disk
        if (file.buffer) {
            await fs.writeFile(filePath, file.buffer);
        } else if (file.path) {
            await fs.copyFile(file.path, filePath);
        } else {
            throw new Error('Invalid file object');
        }

        // Create database record
        const result = await db.query(`
            INSERT INTO attachments (
                ticket_id, comment_id,
                uploaded_by_agent_id, uploaded_by_user_id,
                filename, original_filename, file_path,
                file_size, mime_type, file_extension, checksum
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `, [
            ticketId, commentId,
            uploadedByAgentId, uploadedByUserId,
            uniqueFilename, file.originalname, filePath,
            file.size, file.mimetype, fileExtension, checksum
        ]);

        return result.rows[0];
    }

    /**
     * Validate file
     */
    validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        if (file.size > this.maxFileSize) {
            throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
        }

        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`File type ${file.mimetype} is not allowed`);
        }
    }

    /**
     * Calculate file checksum (SHA-256)
     */
    async calculateChecksum(input) {
        const hash = crypto.createHash('sha256');

        if (Buffer.isBuffer(input)) {
            hash.update(input);
        } else {
            const fileBuffer = await fs.readFile(input);
            hash.update(fileBuffer);
        }

        return hash.digest('hex');
    }

    /**
     * Get attachment by ID
     */
    async getAttachment(attachmentId) {
        const result = await db.query(`
            SELECT
                a.*,
                t.ticket_number,
                ag.full_name as uploaded_by_agent_name,
                u.full_name as uploaded_by_user_name
            FROM attachments a
            LEFT JOIN tickets t ON a.ticket_id = t.id
            LEFT JOIN agents ag ON a.uploaded_by_agent_id = ag.id
            LEFT JOIN users u ON a.uploaded_by_user_id = u.id
            WHERE a.id = $1;
        `, [attachmentId]);

        return result.rows[0];
    }

    /**
     * Get attachments for a ticket
     */
    async getTicketAttachments(ticketId) {
        const result = await db.query(`
            SELECT
                a.*,
                ag.full_name as uploaded_by_agent_name,
                u.full_name as uploaded_by_user_name,
                tc.id as comment_id
            FROM attachments a
            LEFT JOIN agents ag ON a.uploaded_by_agent_id = ag.id
            LEFT JOIN users u ON a.uploaded_by_user_id = u.id
            LEFT JOIN ticket_comments tc ON a.comment_id = tc.id
            WHERE a.ticket_id = $1
            ORDER BY a.created_at DESC;
        `, [ticketId]);

        return result.rows;
    }

    /**
     * Delete attachment
     */
    async deleteAttachment(attachmentId) {
        const attachment = await this.getAttachment(attachmentId);

        if (!attachment) {
            throw new Error('Attachment not found');
        }

        // Delete file from disk
        try {
            await fs.unlink(attachment.file_path);
        } catch (error) {
            console.error('Error deleting file from disk:', error);
            // Continue with database deletion even if file deletion fails
        }

        // Delete database record
        await db.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

        return { success: true, message: 'Attachment deleted successfully' };
    }

    /**
     * Get attachment statistics
     */
    async getAttachmentStats(ticketId = null) {
        let query = `
            SELECT
                COUNT(*) as total_attachments,
                SUM(file_size) as total_size_bytes,
                ROUND(AVG(file_size)::numeric, 2) as avg_size_bytes,
                MAX(file_size) as max_size_bytes,
                MIN(file_size) as min_size_bytes,
                COUNT(DISTINCT ticket_id) as tickets_with_attachments,
                COUNT(CASE WHEN mime_type LIKE 'image/%' THEN 1 END) as image_count,
                COUNT(CASE WHEN mime_type = 'application/pdf' THEN 1 END) as pdf_count,
                COUNT(CASE WHEN mime_type LIKE 'application/%' AND mime_type != 'application/pdf' THEN 1 END) as document_count
            FROM attachments
        `;

        const params = [];

        if (ticketId) {
            query += ' WHERE ticket_id = $1';
            params.push(ticketId);
        }

        const result = await db.query(query, params);
        return result.rows[0];
    }

    /**
     * Virus scan placeholder
     * In production, integrate with ClamAV or similar
     */
    async scanForVirus(attachmentId) {
        // Placeholder for virus scanning
        // In production, this would integrate with antivirus software

        await db.query(`
            UPDATE attachments
            SET virus_scanned = true, is_safe = true
            WHERE id = $1;
        `, [attachmentId]);

        return { safe: true, scanned: true };
    }

    /**
     * Get file for download
     */
    async getFileForDownload(attachmentId) {
        const attachment = await this.getAttachment(attachmentId);

        if (!attachment) {
            throw new Error('Attachment not found');
        }

        if (!attachment.is_safe) {
            throw new Error('File has not been marked as safe');
        }

        // Check if file exists
        try {
            await fs.access(attachment.file_path);
        } catch {
            throw new Error('File not found on disk');
        }

        return {
            path: attachment.file_path,
            filename: attachment.original_filename,
            mimetype: attachment.mime_type
        };
    }
}

module.exports = new AttachmentHandler();
