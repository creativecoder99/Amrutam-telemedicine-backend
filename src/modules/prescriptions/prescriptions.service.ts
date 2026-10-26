import crypto from 'crypto';
import { dbStore, PrescriptionEntity, PrescriptionItemEntity } from '../../database/store.js';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors.js';
import { generateHmacSignature, verifyHmacSignature } from '../../utils/crypto.js';

export class PrescriptionsService {
  async createPrescription(data: {
    consultationId: string;
    doctorId: string;
    patientId: string;
    diagnosisNotes: string;
    dietaryAdvice: string;
    lifestyleInstructions: string;
    items: Array<{
      medicineName: string;
      formulation: string;
      dosage: string;
      frequency: string;
      anupana: string;
      durationDays: number;
      specialInstructions?: string;
    }>;
  }) {
    const consultation = dbStore.consultations.get(data.consultationId);
    if (!consultation) throw new NotFoundError('Consultation', data.consultationId);

    // Check if prescription already exists for this consultation
    const existing = Array.from(dbStore.prescriptions.values()).find(
      (p) => p.consultationId === data.consultationId
    );
    if (existing) {
      throw new ConflictError('A finalized digital prescription already exists for this consultation.');
    }

    const prescriptionId = crypto.randomUUID();
    const signedAt = new Date().toISOString();

    // Canonical payload for cryptographic HMAC-SHA256 signature
    const canonicalPayload = `${data.consultationId}|${data.doctorId}|${data.patientId}|${data.diagnosisNotes}|${signedAt}`;
    const digitalSignature = generateHmacSignature(canonicalPayload);

    const prescriptionItems: PrescriptionItemEntity[] = data.items.map((item) => ({
      id: crypto.randomUUID(),
      prescriptionId,
      ...item,
    }));

    const prescription: PrescriptionEntity = {
      id: prescriptionId,
      consultationId: data.consultationId,
      doctorId: data.doctorId,
      patientId: data.patientId,
      diagnosisNotes: data.diagnosisNotes,
      dietaryAdvice: data.dietaryAdvice,
      lifestyleInstructions: data.lifestyleInstructions,
      digitalSignature,
      signedAt,
      isFinalized: true,
      items: prescriptionItems,
    };

    dbStore.prescriptions.set(prescriptionId, prescription);

    // Also mark consultation completed if in progress
    if (consultation.status !== 'COMPLETED') {
      consultation.status = 'COMPLETED';
      dbStore.consultations.set(data.consultationId, consultation);
    }

    return prescription;
  }

  async getPrescriptionById(id: string) {
    const prescription = dbStore.prescriptions.get(id);
    if (!prescription) {
      throw new NotFoundError('Prescription', id);
    }

    const doctor = dbStore.doctors.get(prescription.doctorId);
    const patientProfile = dbStore.profiles.get(prescription.patientId);

    // Verify cryptographic integrity
    const canonicalPayload = `${prescription.consultationId}|${prescription.doctorId}|${prescription.patientId}|${prescription.diagnosisNotes}|${prescription.signedAt}`;
    const isSignatureValid = verifyHmacSignature(canonicalPayload, prescription.digitalSignature);

    return {
      ...prescription,
      isSignatureValid,
      signatureAlgorithm: 'HMAC-SHA256',
      doctor: doctor
        ? {
            id: doctor.id,
            fullName: doctor.fullName,
            licenseNumber: doctor.licenseNumber,
            qualification: doctor.qualification,
            primarySpecialty: doctor.primarySpecialty,
          }
        : null,
      patient: {
        id: prescription.patientId,
        fullName: patientProfile?.fullName || 'Patient',
        prakritiType: patientProfile?.prakritiType,
      },
    };
  }

  async listPatientPrescriptions(patientId: string) {
    const list = Array.from(dbStore.prescriptions.values()).filter(
      (p) => p.patientId === patientId
    );

    return list.map((p) => {
      const doc = dbStore.doctors.get(p.doctorId);
      return {
        ...p,
        doctorName: doc?.fullName || 'Vaidya Consultant',
        licenseNumber: doc?.licenseNumber,
        specialty: doc?.primarySpecialty,
      };
    });
  }
}

export const prescriptionsService = new PrescriptionsService();
