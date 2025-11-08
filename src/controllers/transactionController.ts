import { Request, Response } from 'express';
import transactionService from '../services/transactionService';
import { TransactionType, BulkTransferDto } from '../types/models';

export class TransactionController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const {
        itemId,
        warehouseId,
        transactionType,
        startDate,
        endDate,
        limit = '100',
        offset = '0',
      } = req.query;

      const transactions = await transactionService.getAll({
        itemId: itemId as string,
        warehouseId: warehouseId as string,
        transactionType: transactionType as TransactionType,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({ success: true, data: transactions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async recordInbound(req: Request, res: Response): Promise<void> {
    try {
      const { itemId, batchId, warehouseId, quantity, unitCost, referenceNumber, createdBy, notes } = req.body;
      const transaction = await transactionService.recordInbound(
        itemId,
        batchId,
        warehouseId,
        quantity,
        unitCost,
        referenceNumber,
        createdBy,
        notes
      );
      res.status(201).json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async recordOutbound(req: Request, res: Response): Promise<void> {
    try {
      const { itemId, batchId, warehouseId, quantity, referenceNumber, createdBy, notes } = req.body;
      const transaction = await transactionService.recordOutbound(
        itemId,
        batchId,
        warehouseId,
        quantity,
        referenceNumber,
        createdBy,
        notes
      );
      res.status(201).json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async recordTransfer(req: Request, res: Response): Promise<void> {
    try {
      const dto: BulkTransferDto = req.body;
      const result = await transactionService.recordTransfer(dto);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async recordAdjustment(req: Request, res: Response): Promise<void> {
    try {
      const { itemId, batchId, warehouseId, quantityChange, reason, createdBy } = req.body;
      const transaction = await transactionService.recordAdjustment(
        itemId,
        batchId,
        warehouseId,
        quantityChange,
        reason,
        createdBy
      );
      res.status(201).json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getItemHistory(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;
      const { limit = '100' } = req.query;
      const history = await transactionService.getItemHistory(itemId, parseInt(limit as string));
      res.json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const summary = await transactionService.getTransactionSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new TransactionController();
