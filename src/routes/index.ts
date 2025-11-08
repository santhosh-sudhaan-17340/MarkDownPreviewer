import { Router } from 'express';
import itemController from '../controllers/itemController';
import batchController from '../controllers/batchController';
import transactionController from '../controllers/transactionController';
import warehouseController from '../controllers/warehouseController';
import alertController from '../controllers/alertController';
import bulkOperationsService from '../services/bulkOperationsService';

const router = Router();

// ========================================
// ITEM ROUTES
// ========================================
router.post('/items', (req, res) => itemController.create(req, res));
router.get('/items', (req, res) => itemController.getAll(req, res));
router.get('/items/low-stock', (req, res) => itemController.getLowStock(req, res));
router.get('/items/categories', (req, res) => itemController.getCategories(req, res));
router.get('/items/:id', (req, res) => itemController.getById(req, res));
router.put('/items/:id', (req, res) => itemController.update(req, res));
router.delete('/items/:id', (req, res) => itemController.delete(req, res));
router.post('/items/bulk', (req, res) => itemController.bulkCreate(req, res));

// ========================================
// BATCH ROUTES
// ========================================
router.post('/batches', (req, res) => batchController.create(req, res));
router.get('/batches/:id', (req, res) => batchController.getById(req, res));
router.get('/batches/item/:itemId', (req, res) => batchController.getByItemId(req, res));
router.get('/batches/warehouse/:warehouseId', (req, res) => batchController.getByWarehouseId(req, res));
router.get('/batches/expiring/soon', (req, res) => batchController.getExpiring(req, res));
router.get('/batches/expired/list', (req, res) => batchController.getExpired(req, res));
router.put('/batches/:id', (req, res) => batchController.update(req, res));
router.delete('/batches/:id', (req, res) => batchController.delete(req, res));
router.get('/batches/quantity/:itemId', (req, res) => batchController.getTotalQuantity(req, res));

// ========================================
// TRANSACTION ROUTES
// ========================================
router.get('/transactions', (req, res) => transactionController.getAll(req, res));
router.post('/transactions/inbound', (req, res) => transactionController.recordInbound(req, res));
router.post('/transactions/outbound', (req, res) => transactionController.recordOutbound(req, res));
router.post('/transactions/transfer', (req, res) => transactionController.recordTransfer(req, res));
router.post('/transactions/adjustment', (req, res) => transactionController.recordAdjustment(req, res));
router.get('/transactions/item/:itemId/history', (req, res) => transactionController.getItemHistory(req, res));
router.get('/transactions/summary', (req, res) => transactionController.getSummary(req, res));

// ========================================
// WAREHOUSE ROUTES
// ========================================
router.post('/warehouses', (req, res) => warehouseController.create(req, res));
router.get('/warehouses', (req, res) => warehouseController.getAll(req, res));
router.get('/warehouses/utilization', (req, res) => warehouseController.getAllWithUtilization(req, res));
router.get('/warehouses/near-capacity', (req, res) => warehouseController.getNearCapacity(req, res));
router.get('/warehouses/:id', (req, res) => warehouseController.getById(req, res));
router.put('/warehouses/:id', (req, res) => warehouseController.update(req, res));
router.delete('/warehouses/:id', (req, res) => warehouseController.delete(req, res));
router.get('/warehouses/:id/inventory', (req, res) => warehouseController.getInventorySummary(req, res));
router.get('/warehouses/:id/utilization', (req, res) => warehouseController.getCapacityUtilization(req, res));

// ========================================
// ALERT ROUTES
// ========================================
router.get('/alerts', (req, res) => alertController.getAll(req, res));
router.get('/alerts/active', (req, res) => alertController.getActive(req, res));
router.get('/alerts/critical', (req, res) => alertController.getCritical(req, res));
router.get('/alerts/statistics', (req, res) => alertController.getStatistics(req, res));
router.post('/alerts/check', (req, res) => alertController.checkAll(req, res));
router.put('/alerts/:id/acknowledge', (req, res) => alertController.acknowledge(req, res));
router.put('/alerts/:id/resolve', (req, res) => alertController.resolve(req, res));

// ========================================
// BULK OPERATIONS ROUTES
// ========================================
router.post('/bulk/items/create', async (req, res) => {
  try {
    const result = await bulkOperationsService.bulkCreateItems(req.body.items);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/bulk/batches/create', async (req, res) => {
  try {
    const result = await bulkOperationsService.bulkCreateBatches(req.body.batches);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/bulk/items/prices', async (req, res) => {
  try {
    const count = await bulkOperationsService.bulkUpdateItemPrices(req.body.updates);
    res.json({ success: true, data: { updated_count: count } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/bulk/batches/quantities', async (req, res) => {
  try {
    const count = await bulkOperationsService.bulkUpdateBatchQuantities(req.body.updates);
    res.json({ success: true, data: { updated_count: count } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/bulk/export/inventory', async (req, res) => {
  try {
    const data = await bulkOperationsService.exportInventoryData();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/bulk/import/csv', async (req, res) => {
  try {
    const result = await bulkOperationsService.bulkImportFromCSV(req.body.data);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/bulk/statistics', async (req, res) => {
  try {
    const stats = await bulkOperationsService.getDatabaseStatistics();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// HEALTH CHECK
// ========================================
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy', timestamp: new Date() });
});

export default router;
