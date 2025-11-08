import { Resource, Schedule, Appointment } from '@prisma/client';
import prisma from '../database/client';
import {
  addDays,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
  addMinutes,
  differenceInMinutes
} from 'date-fns';
import { generateTimeSlots, getDayOfWeek, TimeSlot, slotsOverlap } from '../utils/timeSlots';

export interface AvailableSlot {
  resourceId: string;
  resourceName: string;
  startTime: Date;
  endTime: Date;
}

export interface SearchAvailabilityInput {
  resourceId?: string; // Optional: search for specific resource or all
  resourceType?: string; // Optional: filter by resource type
  startDate?: Date; // Search from this date (default: now)
  endDate?: Date; // Search until this date (default: 30 days from start)
  durationMinutes?: number; // Required slot duration (default: 30)
  limit?: number; // Maximum number of results (default: 10)
}

export class AvailabilityService {
  private readonly DEFAULT_DURATION_MINUTES = 30;
  private readonly DEFAULT_SEARCH_DAYS = 30;
  private readonly DEFAULT_LIMIT = 10;

  /**
   * Find the nearest available slot(s) for booking
   * This is optimized for performance with proper indexing
   */
  async findNearestAvailableSlots(
    input: SearchAvailabilityInput
  ): Promise<AvailableSlot[]> {
    const {
      resourceId,
      resourceType,
      startDate = new Date(),
      durationMinutes = this.DEFAULT_DURATION_MINUTES,
      limit = this.DEFAULT_LIMIT
    } = input;

    let endDate = input.endDate;
    if (!endDate) {
      endDate = addDays(startDate, this.DEFAULT_SEARCH_DAYS);
    }

    // Get resources to search
    const resources = await this.getSearchableResources(resourceId, resourceType);

    if (resources.length === 0) {
      return [];
    }

    const availableSlots: AvailableSlot[] = [];

    // Search day by day until we find enough slots or reach end date
    let currentDate = startOfDay(startDate);
    const searchEndDate = endOfDay(endDate);

    while (
      isBefore(currentDate, searchEndDate) &&
      availableSlots.length < limit
    ) {
      // Get slots for this day across all resources
      for (const resource of resources) {
        if (availableSlots.length >= limit) {
          break;
        }

        const daySlots = await this.getAvailableSlotsForResourceDay(
          resource,
          currentDate,
          durationMinutes,
          startDate
        );

        availableSlots.push(...daySlots);
      }

      currentDate = addDays(currentDate, 1);
    }

    // Sort by start time and limit results
    return availableSlots
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Get available slots for a specific resource on a specific day
   */
  async getAvailableSlotsForResourceDay(
    resource: Resource & { schedules: Schedule[] },
    date: Date,
    durationMinutes: number,
    earliestTime: Date = new Date()
  ): Promise<AvailableSlot[]> {
    const dayOfWeek = getDayOfWeek(date);

    // Find schedule for this day
    const schedule = resource.schedules.find(s => s.dayOfWeek === dayOfWeek);

    if (!schedule) {
      return []; // Resource doesn't work on this day
    }

    // Generate all possible slots for this day
    const possibleSlots = generateTimeSlots(
      date,
      schedule.startTime,
      schedule.endTime,
      durationMinutes
    );

    // Get existing appointments for this resource on this day
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        resourceId: resource.id,
        startTime: { gte: startOfDay(date) },
        endTime: { lte: endOfDay(date) },
        status: { in: ['CONFIRMED', 'PENDING'] }
      },
      select: {
        startTime: true,
        endTime: true
      }
    });

    // Filter out slots that overlap with existing appointments or are in the past
    const availableSlots: AvailableSlot[] = [];

    for (const slot of possibleSlots) {
      // Skip if slot is in the past
      if (isBefore(slot.startTime, earliestTime)) {
        continue;
      }

      // Check if slot overlaps with any existing appointment
      const hasConflict = existingAppointments.some(appointment =>
        slotsOverlap(slot, {
          startTime: appointment.startTime,
          endTime: appointment.endTime
        })
      );

      if (!hasConflict) {
        availableSlots.push({
          resourceId: resource.id,
          resourceName: resource.name,
          startTime: slot.startTime,
          endTime: slot.endTime
        });
      }
    }

    return availableSlots;
  }

  /**
   * Get searchable resources based on criteria
   */
  private async getSearchableResources(
    resourceId?: string,
    resourceType?: string
  ): Promise<Array<Resource & { schedules: Schedule[] }>> {
    const where: any = {
      isActive: true
    };

    if (resourceId) {
      where.id = resourceId;
    }

    if (resourceType) {
      where.type = resourceType;
    }

    return await prisma.resource.findMany({
      where,
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });
  }

  /**
   * Check if a specific time slot is available
   */
  async isSlotAvailable(
    resourceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // Check for conflicts
    const conflicts = await prisma.appointment.count({
      where: {
        resourceId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    });

    return conflicts === 0;
  }

  /**
   * Get all available slots for a resource within a date range
   */
  async getResourceAvailability(
    resourceId: string,
    startDate: Date,
    endDate: Date,
    durationMinutes: number = this.DEFAULT_DURATION_MINUTES
  ): Promise<AvailableSlot[]> {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });

    if (!resource) {
      throw new Error('Resource not found');
    }

    const availableSlots: AvailableSlot[] = [];
    let currentDate = startOfDay(startDate);
    const searchEndDate = endOfDay(endDate);

    while (isBefore(currentDate, searchEndDate)) {
      const daySlots = await this.getAvailableSlotsForResourceDay(
        resource,
        currentDate,
        durationMinutes
      );

      availableSlots.push(...daySlots);
      currentDate = addDays(currentDate, 1);
    }

    return availableSlots;
  }

  /**
   * Get resource utilization statistics
   */
  async getResourceUtilization(
    resourceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    resourceId: string;
    totalSlots: number;
    bookedSlots: number;
    availableSlots: number;
    utilizationPercentage: number;
  }> {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });

    if (!resource) {
      throw new Error('Resource not found');
    }

    // Calculate total possible working minutes
    let totalMinutes = 0;
    let currentDate = startOfDay(startDate);
    const searchEndDate = endOfDay(endDate);

    while (isBefore(currentDate, searchEndDate)) {
      const dayOfWeek = getDayOfWeek(currentDate);
      const schedule = resource.schedules.find(s => s.dayOfWeek === dayOfWeek);

      if (schedule) {
        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
        const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

        const start = new Date(currentDate);
        start.setHours(startHour, startMinute, 0, 0);

        const end = new Date(currentDate);
        end.setHours(endHour, endMinute, 0, 0);

        totalMinutes += differenceInMinutes(end, start);
      }

      currentDate = addDays(currentDate, 1);
    }

    // Calculate booked minutes
    const appointments = await prisma.appointment.findMany({
      where: {
        resourceId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: { in: ['CONFIRMED', 'PENDING', 'COMPLETED'] }
      }
    });

    const bookedMinutes = appointments.reduce(
      (sum, apt) => sum + differenceInMinutes(apt.endTime, apt.startTime),
      0
    );

    const totalSlots = Math.floor(totalMinutes / this.DEFAULT_DURATION_MINUTES);
    const bookedSlots = Math.floor(bookedMinutes / this.DEFAULT_DURATION_MINUTES);
    const availableSlots = totalSlots - bookedSlots;
    const utilizationPercentage = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    return {
      resourceId,
      totalSlots,
      bookedSlots,
      availableSlots,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100
    };
  }
}

export default new AvailabilityService();
