import batchService from '../services/batchService';
import { query } from '../database/connection';
import { CreateBatchDto } from '../types/models';

jest.mock('../database/connection');

describe('BatchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new batch', async () => {
      const mockBatch = {
        id: 'batch-123',
        item_id: 'item-123',
        warehouse_id: 'warehouse-123',
        batch_number: 'BATCH-001',
        quantity: 100,
        version: 1,
      };

      (query as jest.Mock).mockResolvedValue({ rows: [mockBatch] });

      const dto: CreateBatchDto = {
        item_id: 'item-123',
        warehouse_id: 'warehouse-123',
        batch_number: 'BATCH-001',
        quantity: 100,
      };

      const result = await batchService.create(dto);

      expect(result).toEqual(mockBatch);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO batches'),
        expect.any(Array)
      );
    });
  });

  describe('getExpiringBatches', () => {
    it('should return batches expiring within specified days', async () => {
      const mockBatches = [
        {
          id: 'batch-1',
          batch_number: 'BATCH-001',
          expiry_date: new Date('2024-12-31'),
          quantity: 50,
        },
      ];

      (query as jest.Mock).mockResolvedValue({ rows: mockBatches });

      const result = await batchService.getExpiringBatches(30);

      expect(result).toEqual(mockBatches);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('expiry_date <='),
        [30]
      );
    });
  });

  describe('getTotalQuantity', () => {
    it('should return total quantity for an item', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ total: '250' }] });

      const result = await batchService.getTotalQuantity('item-123');

      expect(result).toBe(250);
    });

    it('should return total quantity for item in specific warehouse', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ total: '100' }] });

      const result = await batchService.getTotalQuantity('item-123', 'warehouse-123');

      expect(result).toBe(100);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND warehouse_id = $2'),
        ['item-123', 'warehouse-123']
      );
    });
  });

  describe('FIFO/FEFO ordering', () => {
    it('should return batches in FIFO order', async () => {
      const mockBatches = [
        { id: 'batch-1', created_at: '2024-01-01' },
        { id: 'batch-2', created_at: '2024-01-02' },
      ];

      (query as jest.Mock).mockResolvedValue({ rows: mockBatches });

      const result = await batchService.getBatchesFIFO('item-123', 'warehouse-123');

      expect(result).toEqual(mockBatches);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        ['item-123', 'warehouse-123']
      );
    });
  });
});
