import { dbStore, UserEntity, UserProfileEntity } from '../../database/store.js';
import { NotFoundError } from '../../core/errors.js';

export class PatientsService {
  async listPatients() {
    const patientUsers = Array.from(dbStore.users.values()).filter((u) => u.role === 'PATIENT');
    return patientUsers.map((u) => {
      const profile = dbStore.profiles.get(u.id);
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        fullName: profile?.fullName || 'Patient User',
        phone: profile?.phone || '',
        gender: profile?.gender || 'UNDETERMINED',
        prakritiType: profile?.prakritiType || 'VATA_PITTA',
        address: profile?.address || '',
        emergencyContact: profile?.emergencyContact || '',
      };
    });
  }

  async getPatientById(userId: string) {
    const user = dbStore.users.get(userId);
    if (!user) throw new NotFoundError('Patient', userId);

    const profile = dbStore.profiles.get(userId);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: profile?.fullName || 'Patient User',
      phone: profile?.phone || '',
      gender: profile?.gender || 'UNDETERMINED',
      prakritiType: profile?.prakritiType || 'VATA_PITTA',
      address: profile?.address || '',
      emergencyContact: profile?.emergencyContact || '',
      createdAt: user.createdAt,
    };
  }

  async updatePatientProfile(
    userId: string,
    data: Partial<UserProfileEntity> & { email?: string }
  ) {
    const user = dbStore.users.get(userId);
    if (!user) throw new NotFoundError('Patient', userId);

    if (data.email) {
      user.email = data.email.toLowerCase();
      dbStore.users.set(userId, user);
    }

    let profile = dbStore.profiles.get(userId);
    if (!profile) {
      profile = {
        id: `p_${userId.slice(0, 8)}`,
        userId,
        fullName: data.fullName || 'Patient User',
        phone: data.phone || '',
        gender: data.gender || 'UNDETERMINED',
        prakritiType: data.prakritiType || 'UNDETERMINED',
      };
    } else {
      profile = {
        ...profile,
        ...data,
        id: profile.id,
        userId: profile.userId,
      };
    }

    dbStore.profiles.set(userId, profile);
    dbStore.appendAuditLog('PATIENT_PROFILE_UPDATED', 'PATIENT', userId, userId, 'API', 'Patient Profile Update');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: profile.fullName,
      phone: profile.phone,
      gender: profile.gender,
      prakritiType: profile.prakritiType,
      address: profile.address,
      emergencyContact: profile.emergencyContact,
    };
  }

  async deletePatient(userId: string) {
    const user = dbStore.users.get(userId);
    if (!user) throw new NotFoundError('Patient', userId);

    dbStore.deletePatient(userId);
    dbStore.appendAuditLog('PATIENT_DELETED', 'PATIENT', userId, 'ADMIN', 'API', 'Admin User Management');

    return { success: true, message: `Patient account ${user.email} deleted successfully.` };
  }
}

export const patientsService = new PatientsService();
