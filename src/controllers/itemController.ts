import { Request, Response } from 'express';
import itemService from '../services/itemService';
import { CreateItemDto, UpdateItemDto, OptimisticLockError } from '../types/models';

export class ItemController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateItemDto = req.body;
      const item = await itemService.create(dto);
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await itemService.getById(id);

      if (!item) {
        res.status(404).json({ success: false, error: 'Item not found' });
        return;
      }

      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '50',
        category,
        isActive,
        searchTerm,
      } = req.query;

      const result = await itemService.getAll({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        category: category as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        searchTerm: searchTerm as string,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateItemDto = req.body;
      const item = await itemService.update(id, dto);
      res.json({ success: true, data: item });
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
      const success = await itemService.delete(id);

      if (!success) {
        res.status(404).json({ success: false, error: 'Item not found' });
        return;
      }

      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getLowStock(req: Request, res: Response): Promise<void> {
    try {
      const items = await itemService.getLowStockItems();
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await itemService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      const { items } = req.body;
      const result = await itemService.bulkCreate({ items });
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export default new ItemController();
