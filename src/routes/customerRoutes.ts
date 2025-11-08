import { Router, Request, Response } from 'express';
import customerService from '../services/customerService';
import bookingService from '../services/bookingService';
import penaltyService from '../services/penaltyService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1)
});

/**
 * POST /api/customers
 * Create a new customer
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const customer = await customerService.createCustomer(data);
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/customers/:id
 * Get customer by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/customers/email/:email
 * Get customer by email
 */
router.get('/email/:email', async (req: Request, res: Response) => {
  try {
    const customer = await customerService.getCustomerByEmail(req.params.email);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/customers/:id
 * Update customer
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = createCustomerSchema.partial().parse(req.body);
    const customer = await customerService.updateCustomer(req.params.id, data);
    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/customers/:id/appointments
 * Get customer's appointments
 */
router.get('/:id/appointments', async (req: Request, res: Response) => {
  try {
    const futureOnly = req.query.futureOnly === 'true';
    const appointments = await bookingService.getCustomerAppointments(
      req.params.id,
      futureOnly
    );
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/customers/:id/stats
 * Get customer statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const stats = await customerService.getCustomerStats(req.params.id);
    if (!stats) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/customers/:id/penalties
 * Get customer's penalties
 */
router.get('/:id/penalties', async (req: Request, res: Response) => {
  try {
    const unpaidOnly = req.query.unpaidOnly === 'true';

    const penalties = unpaidOnly
      ? await penaltyService.getCustomerUnpaidPenalties(req.params.id)
      : await penaltyService.getCustomerPenalties(req.params.id);

    res.json(penalties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
