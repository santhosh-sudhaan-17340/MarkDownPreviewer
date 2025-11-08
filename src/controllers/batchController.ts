import { Request, Response } from 'express';
import batchService from '../services/batchService';
import { CreateBatchDto, UpdateBatchDto, OptimisticLockError } from '../types/models';

export class BatchController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateBatchDto = req.body;
      const batch = await batchService.create(dto);
      res.status(201).json({ success: true, data: batch });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const batch = await batchService.getBatchWithDetails(id);

      if (!batch) {
        res.status(404).json({ success: false, error: 'Batch not found' });
        return;
      }

      res.json({ success: true, data: batch });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getByItemId(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;
      const batches = await batchService.getByItemId(itemId);
      res.json({ success: true, data: batches });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getByWarehouseId(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId } = req.params;
      const batches = await batchService.getByWarehouseId(warehouseId);
      res.json({ success: true, data: batches });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getExpiring(req: Request, res: Response): Promise<void> {
    try {
      const { days = '30' } = req.query;
      const batches = await batchService.getExpiringBatches(parseInt(days as string));
      res.json({ success: true, data: batches });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getExpired(req: Request, res: Response): Promise<void> {
    try {
      const batches = await batchService.getExpiredBatches();
      res.json({ success: true, data: batches });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateBatchDto = req.body;
      const batch = await batchService.update(id, dto);
      res.json({ success: true, data: batch });
    } catch (error: any) {
      if (error instanceof OptimisticLockError) {
        res.status(409).json({ success: false, error: error.message });
      } else {
        res.status(400).json({ success: false, error: error.message });
      }
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await batchService.delete(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Batch not found' });
        return;
      }

      res.json({ success: true, message: 'Batch deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getTotalQuantity(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;
      const { warehouseId } = req.query;
      const total = await batchService.getTotalQuantity(itemId, warehouseId as string);
      res.json({ success: true, data: { total_quantity: total } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new BatchController();
