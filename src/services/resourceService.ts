import { ResourceType, Resource, Schedule } from '@prisma/client';
import prisma from '../database/client';

export interface CreateResourceInput {
  name: string;
  type: ResourceType;
  email?: string;
  phone?: string;
  description?: string;
}

export interface CreateScheduleInput {
  resourceId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export class ResourceService {
  /**
   * Create a new resource
   */
  async createResource(input: CreateResourceInput): Promise<Resource> {
    return await prisma.resource.create({
      data: input
    });
  }

  /**
   * Get resource by ID
   */
  async getResourceById(id: string): Promise<Resource | null> {
    return await prisma.resource.findUnique({
      where: { id },
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });
  }

  /**
   * Get all active resources
   */
  async getActiveResources(type?: ResourceType): Promise<Resource[]> {
    return await prisma.resource.findMany({
      where: {
        isActive: true,
        ...(type && { type })
      },
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });
  }

  /**
   * Update resource
   */
  async updateResource(
    id: string,
    data: Partial<CreateResourceInput>
  ): Promise<Resource> {
    return await prisma.resource.update({
      where: { id },
      data
    });
  }

  /**
   * Deactivate resource (soft delete)
   */
  async deactivateResource(id: string): Promise<Resource> {
    return await prisma.resource.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Create a schedule for a resource
   */
  async createSchedule(input: CreateScheduleInput): Promise<Schedule> {
    // Validate day of week
    if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
      throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(input.startTime) || !timeRegex.test(input.endTime)) {
      throw new Error('Time must be in HH:MM format');
    }

    // Validate start time is before end time
    if (input.startTime >= input.endTime) {
      throw new Error('Start time must be before end time');
    }

    return await prisma.schedule.create({
      data: input
    });
  }

  /**
   * Get schedules for a resource
   */
  async getResourceSchedules(resourceId: string): Promise<Schedule[]> {
    return await prisma.schedule.findMany({
      where: {
        resourceId,
        isActive: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });
  }

  /**
   * Get schedule for a specific day
   */
  async getResourceScheduleForDay(
    resourceId: string,
    dayOfWeek: number
  ): Promise<Schedule | null> {
    return await prisma.schedule.findFirst({
      where: {
        resourceId,
        dayOfWeek,
        isActive: true
      }
    });
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    id: string,
    data: Partial<CreateScheduleInput>
  ): Promise<Schedule> {
    // Validate inputs if provided
    if (data.dayOfWeek !== undefined && (data.dayOfWeek < 0 || data.dayOfWeek > 6)) {
      throw new Error('Day of week must be between 0 and 6');
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (data.startTime && !timeRegex.test(data.startTime)) {
      throw new Error('Start time must be in HH:MM format');
    }
    if (data.endTime && !timeRegex.test(data.endTime)) {
      throw new Error('End time must be in HH:MM format');
    }

    return await prisma.schedule.update({
      where: { id },
      data
    });
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(id: string): Promise<Schedule> {
    return await prisma.schedule.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

export default new ResourceService();
