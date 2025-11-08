import { Request, Response } from 'express';
import warehouseService from '../services/warehouseService';
import { CreateWarehouseDto, UpdateWarehouseDto, OptimisticLockError } from '../types/models';

export class WarehouseController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateWarehouseDto = req.body;
      const warehouse = await warehouseService.create(dto);
      res.status(201).json({ success: true, data: warehouse });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const warehouse = await warehouseService.getById(id);

      if (!warehouse) {
        res.status(404).json({ success: false, error: 'Warehouse not found' });
        return;
      }

      res.json({ success: true, data: warehouse });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { activeOnly = 'true' } = req.query;
      const warehouses = await warehouseService.getAll(activeOnly === 'true');
      res.json({ success: true, data: warehouses });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAllWithUtilization(req: Request, res: Response): Promise<void> {
    try {
      const warehouses = await warehouseService.getAllWithUtilization();
      res.json({ success: true, data: warehouses });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateWarehouseDto = req.body;
      const warehouse = await warehouseService.update(id, dto);
      res.json({ success: true, data: warehouse });
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
      const success = await warehouseService.delete(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Warehouse not found' });
        return;
      }

      res.json({ success: true, message: 'Warehouse deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getInventorySummary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const summary = await warehouseService.getInventorySummary(id);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCapacityUtilization(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const utilization = await warehouseService.getCapacityUtilization(id);
      res.json({ success: true, data: utilization });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getNearCapacity(req: Request, res: Response): Promise<void> {
    try {
      const { threshold = '80' } = req.query;
      const warehouses = await warehouseService.getWarehousesNearCapacity(parseInt(threshold as string));
      res.json({ success: true, data: warehouses });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new WarehouseController();
