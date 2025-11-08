import itemService from '../services/itemService';
import { query } from '../database/connection';
import { CreateItemDto, UpdateItemDto, OptimisticLockError } from '../types/models';

// Mock the database connection
jest.mock('../database/connection');

describe('ItemService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new item', async () => {
      const mockItem = {
        id: '123',
        sku: 'TEST-001',
        name: 'Test Item',
        unit_price: 10.99,
        reorder_level: 10,
        reorder_quantity: 50,
        version: 1,
      };

      (query as jest.Mock).mockResolvedValue({ rows: [mockItem] });

      const dto: CreateItemDto = {
        sku: 'TEST-001',
        name: 'Test Item',
        unit_price: 10.99,
      };

      const result = await itemService.create(dto);

      expect(result).toEqual(mockItem);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO items'),
        expect.arrayContaining(['TEST-001', 'Test Item'])
      );
    });
  });

  describe('getById', () => {
    it('should return an item by id', async () => {
      const mockItem = {
        id: '123',
        sku: 'TEST-001',
        name: 'Test Item',
      };

      (query as jest.Mock).mockResolvedValue({ rows: [mockItem] });

      const result = await itemService.getById('123');

      expect(result).toEqual(mockItem);
      expect(query).toHaveBeenCalledWith(
        'SELECT * FROM items WHERE id = $1',
        ['123']
      );
    });

    it('should return null if item not found', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await itemService.getById('999');

      expect(result).toBeNull();
    });
  });

  describe('update with optimistic locking', () => {
    it('should throw OptimisticLockError if version mismatch', async () => {
      const mockTransaction = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ version: 2 }] }) // Current version is 2
          .mockResolvedValueOnce({ rows: [] }),
        release: jest.fn(),
      };

      // Mock the transaction helper
      jest.spyOn(require('../database/connection'), 'transaction')
        .mockImplementation(async (callback) => {
          return callback(mockTransaction);
        });

      const dto: UpdateItemDto = {
        name: 'Updated Item',
        version: 1, // Trying to update with old version
      };

      await expect(itemService.update('123', dto)).rejects.toThrow(OptimisticLockError);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple items in a single query', async () => {
      const mockItems = [
        { id: '1', sku: 'SKU-001', name: 'Item 1' },
        { id: '2', sku: 'SKU-002', name: 'Item 2' },
      ];

      (query as jest.Mock).mockResolvedValue({ rows: mockItems });

      const dto = {
        items: [
          { sku: 'SKU-001', name: 'Item 1', unit_price: 10 },
          { sku: 'SKU-002', name: 'Item 2', unit_price: 20 },
        ],
      };

      const result = await itemService.bulkCreate(dto);

      expect(result).toEqual(mockItems);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO items'),
        expect.any(Array)
      );
    });

    it('should return empty array if no items provided', async () => {
      const result = await itemService.bulkCreate({ items: [] });

      expect(result).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    });
  });
});
