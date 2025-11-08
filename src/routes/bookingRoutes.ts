import { Router, Request, Response } from 'express';
import bookingService from '../services/bookingService';
import reminderService from '../services/reminderService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createAppointmentSchema = z.object({
  resourceId: z.string().uuid(),
  customerId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional()
});

const rescheduleSchema = z.object({
  newStartTime: z.string().datetime(),
  newEndTime: z.string().datetime()
});

/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createAppointmentSchema.parse(req.body);

    const appointment = await bookingService.createAppointment({
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime)
    });

    // Create reminders
    const reminderHours = process.env.REMINDER_HOURS_BEFORE
      ? JSON.parse(process.env.REMINDER_HOURS_BEFORE)
      : [24, 2];

    await reminderService.createAppointmentReminders(
      appointment.id,
      reminderHours
    );

    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/appointments/:id
 * Get appointment by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const appointment = await bookingService.getAppointmentById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(appointment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/appointments/:id/cancel
 * Cancel an appointment
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const cancellationWindowHours = Number(
      process.env.CANCELLATION_WINDOW_HOURS || 24
    );

    const result = await bookingService.cancelAppointment(
      req.params.id,
      cancellationWindowHours
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/appointments/:id/no-show
 * Mark appointment as no-show
 */
router.post('/:id/no-show', async (req: Request, res: Response) => {
  try {
    const penaltyAmount = Number(
      process.env.NO_SHOW_PENALTY_AMOUNT || 25
    );

    const appointment = await bookingService.markNoShow(
      req.params.id,
      penaltyAmount
    );

    res.json(appointment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/appointments/:id/complete
 * Mark appointment as completed
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const appointment = await bookingService.completeAppointment(req.params.id);
    res.json(appointment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/appointments/:id/reschedule
 * Reschedule an appointment
 */
router.post('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const data = rescheduleSchema.parse(req.body);

    const appointment = await bookingService.rescheduleAppointment(
      req.params.id,
      new Date(data.newStartTime),
      new Date(data.newEndTime)
    );

    // Create new reminders for rescheduled appointment
    const reminderHours = process.env.REMINDER_HOURS_BEFORE
      ? JSON.parse(process.env.REMINDER_HOURS_BEFORE)
      : [24, 2];

    await reminderService.createAppointmentReminders(
      appointment.id,
      reminderHours
    );

    res.json(appointment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
