import crypto from 'crypto';
import { dbStore, AvailabilitySlotEntity } from '../../database/store.js';
import { NotFoundError } from '../../core/errors.js';

export class AvailabilityService {
  async getDoctorSlots(doctorId: string, startDate?: string, endDate?: string): Promise<AvailabilitySlotEntity[]> {
    dbStore.cleanExpiredHolds();

    let slots = Array.from(dbStore.slots.values()).filter((s) => s.doctorId === doctorId);

    if (startDate) {
      const startIso = new Date(startDate).toISOString();
      slots = slots.filter((s) => s.startTime >= startIso);
    }

    if (endDate) {
      const endIso = new Date(endDate).toISOString();
      slots = slots.filter((s) => s.startTime <= endIso);
    }

    // Sort chronologically
    slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return slots;
  }

  async generateSlots(doctorId: string, daysAhead = 14): Promise<AvailabilitySlotEntity[]> {
    const doctor = dbStore.doctors.get(doctorId);
    if (!doctor) throw new NotFoundError('Doctor', doctorId);

    const generated: AvailabilitySlotEntity[] = [];
    const baseDate = new Date();
    baseDate.setMinutes(0, 0, 0);

    const timeSlots = [9, 10, 11, 14, 15, 16, 17]; // hours

    for (let d = 0; d < daysAhead; d++) {
      const date = new Date(baseDate.getTime() + d * 86400000);
      for (const h of timeSlots) {
        const start = new Date(date);
        start.setHours(h, 0, 0, 0);
        const end = new Date(start.getTime() + 30 * 60 * 1000);

        const slotId = `slot-${doctorId.slice(0, 4)}-d${d}-h${h}-${crypto.randomUUID().slice(0, 6)}`;
        
        // Prevent duplicate insertion for identical time
        const existing = Array.from(dbStore.slots.values()).find(
          (s) => s.doctorId === doctorId && s.startTime === start.toISOString()
        );

        if (!existing) {
          const newSlot: AvailabilitySlotEntity = {
            id: slotId,
            doctorId,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            status: 'AVAILABLE',
          };
          dbStore.slots.set(slotId, newSlot);
          generated.push(newSlot);
        }
      }
    }

    return generated;
  }
}

export const availabilityService = new AvailabilityService();
