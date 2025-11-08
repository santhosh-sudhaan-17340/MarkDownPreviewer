import { addMinutes, format, parse, isWithinInterval, areIntervalsOverlapping } from 'date-fns';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

/**
 * Generates time slots for a given day based on schedule
 * @param date The date to generate slots for
 * @param startTime Schedule start time (e.g., "09:00")
 * @param endTime Schedule end time (e.g., "17:00")
 * @param durationMinutes Duration of each slot in minutes
 * @returns Array of time slots
 */
export function generateTimeSlots(
  date: Date,
  startTime: string,
  endTime: string,
  durationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Parse start and end times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  // Create Date objects for start and end
  const slotStart = new Date(date);
  slotStart.setHours(startHour, startMinute, 0, 0);

  const scheduleEnd = new Date(date);
  scheduleEnd.setHours(endHour, endMinute, 0, 0);

  let currentStart = new Date(slotStart);

  while (currentStart < scheduleEnd) {
    const currentEnd = addMinutes(currentStart, durationMinutes);

    if (currentEnd <= scheduleEnd) {
      slots.push({
        startTime: new Date(currentStart),
        endTime: currentEnd
      });
    }

    currentStart = currentEnd;
  }

  return slots;
}

/**
 * Checks if two time slots overlap
 */
export function slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return areIntervalsOverlapping(
    { start: slot1.startTime, end: slot1.endTime },
    { start: slot2.startTime, end: slot2.endTime },
    { inclusive: false }
  );
}

/**
 * Checks if a time is within a slot
 */
export function isTimeInSlot(time: Date, slot: TimeSlot): boolean {
  return isWithinInterval(time, { start: slot.startTime, end: slot.endTime });
}

/**
 * Gets day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Format time to HH:MM
 */
export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Parse HH:MM time string
 */
export function parseTime(timeStr: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
