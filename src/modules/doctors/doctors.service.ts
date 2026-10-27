import crypto from 'crypto';
import { dbStore, DoctorEntity } from '../../database/store.js';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors.js';

export interface DoctorQueryFilter {
  specialty?: string;
  maxFee?: number;
  minRating?: number;
  searchQuery?: string;
  status?: 'VERIFIED' | 'PENDING_VERIFICATION' | 'REJECTED' | 'ALL';
}

export class DoctorsService {
  async listDoctors(filter: DoctorQueryFilter): Promise<DoctorEntity[]> {
    let results = Array.from(dbStore.doctors.values());

    // Filter by verification status (default to VERIFIED for public patient view)
    const statusFilter = filter.status || 'VERIFIED';
    if (statusFilter !== 'ALL') {
      results = results.filter((d) => (d.verificationStatus || 'VERIFIED') === statusFilter);
    }

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

  async createDoctor(data: {
    userId?: string;
    fullName: string;
    email: string;
    licenseNumber: string;
    qualification: string;
    primarySpecialty: string;
    secondarySpecialties?: string[];
    experienceYears: number;
    bio?: string;
    consultationFee?: number;
    licenseDocumentUrl?: string;
    qualificationDocumentUrl?: string;
    idProofUrl?: string;
    isAdminCreated?: boolean;
  }): Promise<DoctorEntity> {
    const existing = Array.from(dbStore.doctors.values()).find(
      (d) => d.licenseNumber.toLowerCase() === data.licenseNumber.toLowerCase()
    );
    if (existing) {
      throw new ConflictError(`Doctor with license number '${data.licenseNumber}' is already registered.`);
    }

    const doctorId = `d_${crypto.randomUUID().slice(0, 12)}`;
    const isVerified = Boolean(data.isAdminCreated);
    const verificationStatus = isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION';

    const doctor: DoctorEntity = {
      id: doctorId,
      userId: data.userId || crypto.randomUUID(),
      fullName: data.fullName,
      email: data.email,
      licenseNumber: data.licenseNumber,
      qualification: data.qualification,
      primarySpecialty: data.primarySpecialty,
      secondarySpecialties: data.secondarySpecialties || [],
      experienceYears: data.experienceYears,
      bio: data.bio || '',
      consultationFee: data.consultationFee || 500,
      rating: 5.0,
      reviewCount: 0,
      isVerified,
      verificationStatus,
      licenseDocumentUrl: data.licenseDocumentUrl,
      qualificationDocumentUrl: data.qualificationDocumentUrl,
      idProofUrl: data.idProofUrl,
    };

    dbStore.doctors.set(doctorId, doctor);

    // Initialize doctor remuneration wallet
    dbStore.wallets.set(doctorId, {
      id: crypto.randomUUID(),
      doctorId,
      balance: 0,
      totalEarned: 0,
      updatedAt: new Date().toISOString(),
    });

    dbStore.appendAuditLog(
      'DOCTOR_REGISTERED',
      'DOCTOR',
      doctorId,
      doctor.userId,
      'API',
      `Status: ${verificationStatus}`
    );

    return doctor;
  }

  /**
   * Admin reviews credentials and verifies or rejects doctor.
   */
  async verifyDoctor(
    doctorId: string,
    status: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<DoctorEntity> {
    const doctor = dbStore.doctors.get(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor', doctorId);
    }

    doctor.verificationStatus = status;
    doctor.isVerified = status === 'VERIFIED';
    doctor.rejectionReason = status === 'REJECTED' ? rejectionReason : undefined;
    dbStore.doctors.set(doctorId, doctor);

    dbStore.appendAuditLog(
      `DOCTOR_${status}`,
      'DOCTOR',
      doctorId,
      'ADMIN',
      'API',
      rejectionReason || 'Admin Doctor KYC Verification'
    );

    return doctor;
  }

  async updateDoctor(doctorId: string, data: Partial<DoctorEntity>): Promise<DoctorEntity> {
    const doctor = dbStore.doctors.get(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor', doctorId);
    }

    const updated: DoctorEntity = {
      ...doctor,
      ...data,
      id: doctor.id, // Immutable ID
    };

    dbStore.doctors.set(doctorId, updated);
    return updated;
  }

  async deleteDoctor(doctorId: string): Promise<{ success: boolean; message: string }> {
    const doctor = dbStore.doctors.get(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor', doctorId);
    }

    dbStore.deleteDoctor(doctorId);
    dbStore.appendAuditLog('DOCTOR_DELETED', 'DOCTOR', doctorId, 'ADMIN', 'API', 'Admin User Management');

    return { success: true, message: `Doctor ${doctor.fullName} deleted successfully.` };
  }
}

export const doctorsService = new DoctorsService();
