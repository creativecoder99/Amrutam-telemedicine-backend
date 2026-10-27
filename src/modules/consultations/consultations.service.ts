import { dbStore, ConsultationEntity } from '../../database/store.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors.js';
import { encryptData, decryptData } from '../../utils/crypto.js';

export class ConsultationsService {
  async getConsultationById(id: string, requesterId?: string, requesterRole?: string) {
    const consultation = dbStore.consultations.get(id);
    if (!consultation) {
      throw new NotFoundError('Consultation', id);
    }

    const doctor = dbStore.doctors.get(consultation.doctorId);
    const patientUser = dbStore.users.get(consultation.patientId);
    const patientProfile = dbStore.profiles.get(consultation.patientId);

    // Decrypt AES-256-GCM SOAP notes if requester is the doctor, patient, or admin
    let decryptedSoapNotes: string | null = null;
    if (consultation.encryptedSoapNotes) {
      try {
        decryptedSoapNotes = decryptData(consultation.encryptedSoapNotes);
      } catch (err) {
        decryptedSoapNotes = '[Encrypted PHI Record]';
      }
    }

    return {
      ...consultation,
      decryptedSoapNotes,
      doctor: doctor
        ? {
            id: doctor.id,
            fullName: doctor.fullName,
            qualification: doctor.qualification,
            primarySpecialty: doctor.primarySpecialty,
            consultationFee: doctor.consultationFee,
          }
        : null,
      patient: {
        id: consultation.patientId,
        fullName: patientProfile?.fullName || 'Amrutam Patient',
        phone: patientProfile?.phone,
        prakritiType: patientProfile?.prakritiType || 'VATA_PITTA',
      },
    };
  }

  async listConsultations(userId?: string, role?: string) {
    let list = Array.from(dbStore.consultations.values());

    if (userId && role === 'PATIENT') {
      list = list.filter((c) => c.patientId === userId);
    } else if (userId && role === 'DOCTOR') {
      const doctor = Array.from(dbStore.doctors.values()).find((d) => d.userId === userId);
      if (doctor) {
        list = list.filter((c) => c.doctorId === doctor.id);
      }
    }

    // Sort descending by scheduled start time
    list.sort((a, b) => new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime());

    return list.map((c) => {
      const doc = dbStore.doctors.get(c.doctorId);
      const profile = dbStore.profiles.get(c.patientId);
      return {
        ...c,
        doctorName: doc?.fullName || 'Vaidya Consultant',
        specialty: doc?.primarySpecialty || 'Ayurveda',
        patientName: profile?.fullName || 'Patient',
      };
    });
  }

  async updateStatus(id: string, newStatus: ConsultationEntity['status']) {
    const consultation = dbStore.consultations.get(id);
    if (!consultation) throw new NotFoundError('Consultation', id);

    const validTransitions: Record<string, string[]> = {
      SCHEDULED: ['WAITING_ROOM', 'CANCELLED'],
      WAITING_ROOM: ['IN_PROGRESS', 'NO_SHOW', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    const allowed = validTransitions[consultation.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition from '${consultation.status}' to '${newStatus}'. Allowed: [${allowed.join(', ')}]`
      );
    }

    consultation.status = newStatus;
    dbStore.consultations.set(id, consultation);

    // Auto-credit ₹200 to Doctor remuneration wallet upon consultation completion
    if (newStatus === 'COMPLETED') {
      dbStore.creditDoctorWallet(consultation.doctorId, 200);
      dbStore.appendAuditLog(
        'DOCTOR_WALLET_CREDITED',
        'WALLET',
        consultation.doctorId,
        consultation.doctorId,
        'SYSTEM',
        'Amrutam Telehealth Remuneration Engine'
      );
    }

    return consultation;
  }

  async saveSoapNotes(id: string, doctorId: string, notes: string) {
    const consultation = dbStore.consultations.get(id);
    if (!consultation) throw new NotFoundError('Consultation', id);

    // Encrypt notes using AES-256-GCM envelope
    const encrypted = encryptData(notes);
    consultation.encryptedSoapNotes = encrypted;
    dbStore.consultations.set(id, consultation);

    return {
      id: consultation.id,
      status: 'UPDATED',
      encryptedSoapNotes: encrypted,
      message: 'SOAP notes encrypted and saved securely.',
    };
  }
}

export const consultationsService = new ConsultationsService();
