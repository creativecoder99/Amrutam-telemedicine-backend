import { dbStore, DoctorEntity } from '../../database/store.js';
import { NotFoundError } from '../../core/errors.js';

export interface DoctorQueryFilter {
  specialty?: string;
  maxFee?: number;
  minRating?: number;
  searchQuery?: string;
}

export class DoctorsService {
  async listDoctors(filter: DoctorQueryFilter): Promise<DoctorEntity[]> {
    let results = Array.from(dbStore.doctors.values());

    if (filter.specialty) {
      const lower = filter.specialty.toLowerCase();
      results = results.filter(
        (d) =>
          d.primarySpecialty.toLowerCase().includes(lower) ||
          d.secondarySpecialties.some((s) => s.toLowerCase().includes(lower))
      );
    }

    if (filter.maxFee !== undefined && !isNaN(filter.maxFee)) {
      results = results.filter((d) => d.consultationFee <= filter.maxFee!);
    }

    if (filter.minRating !== undefined && !isNaN(filter.minRating)) {
      results = results.filter((d) => d.rating >= filter.minRating!);
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      results = results.filter(
        (d) =>
          d.fullName.toLowerCase().includes(query) ||
          d.primarySpecialty.toLowerCase().includes(query) ||
          d.qualification.toLowerCase().includes(query) ||
          d.bio.toLowerCase().includes(query)
      );
    }

    return results;
  }

  async getDoctorById(id: string): Promise<DoctorEntity> {
    const doctor = dbStore.doctors.get(id);
    if (!doctor) {
      throw new NotFoundError('Doctor', id);
    }
    return doctor;
  }
}

export const doctorsService = new DoctorsService();
