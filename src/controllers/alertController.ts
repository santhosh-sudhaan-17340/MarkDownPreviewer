import { Request, Response } from 'express';
import alertService from '../services/alertService';
import { AlertStatus, AcknowledgeAlertDto } from '../types/models';

export class AlertController {
  async getActive(req: Request, res: Response): Promise<void> {
    try {
      const alerts = await alertService.getActiveAlerts();
      res.json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { itemId, warehouseId, status } = req.query;
      const alerts = await alertService.getAll({
        itemId: itemId as string,
        warehouseId: warehouseId as string,
        status: status as AlertStatus,
      });
      res.json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async acknowledge(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: AcknowledgeAlertDto = req.body;
      const alert = await alertService.acknowledge(id, dto);
      res.json({ success: true, data: alert });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async resolve(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const alert = await alertService.resolve(id);
      res.json({ success: true, data: alert });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getCritical(req: Request, res: Response): Promise<void> {
    try {
      const alerts = await alertService.getCriticalAlerts();
      res.json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await alertService.getStatistics();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async checkAll(req: Request, res: Response): Promise<void> {
    try {
      await alertService.checkAllLowStock();
      res.json({ success: true, message: 'Low stock check completed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new AlertController();
