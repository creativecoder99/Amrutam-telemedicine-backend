import { describe, it } from 'node:test';
import assert from 'node:assert';
import { doctorsService } from '../../src/modules/doctors/doctors.service.js';
import { availabilityService } from '../../src/modules/availability/availability.service.js';
import { patientsService } from '../../src/modules/patients/patients.service.js';

describe('Doctor KYC Verification & Admin User Management', () => {
  let createdDoctorId: string;

  it('should register doctor with PENDING_VERIFICATION status', async () => {
    const doctor = await doctorsService.createDoctor({
      fullName: 'Dr. Test Vaidya',
      email: `dr.test.${Date.now()}@amrutam.co.in`,
      licenseNumber: `AY-TEST-${Date.now()}`,
      qualification: 'BAMS, MD',
      primarySpecialty: 'Kayachikitsa',
      experienceYears: 5,
      licenseDocumentUrl: 'https://amrutam.co.in/docs/test_license.pdf',
    });

    createdDoctorId = doctor.id;
    assert.strictEqual(doctor.verificationStatus, 'PENDING_VERIFICATION');
    assert.strictEqual(doctor.isVerified, false);
  });

  it('should block unverified doctor from posting availability slots', async () => {
    await assert.rejects(
      async () => {
        await availabilityService.generateSlots(createdDoctorId, 7);
      },
      {
        name: 'ValidationError',
        message: /Must be verified by Admin before posting availability/,
      }
    );
  });

  it('should allow admin to verify doctor and unlock availability', async () => {
    const verified = await doctorsService.verifyDoctor(createdDoctorId, 'VERIFIED');
    assert.strictEqual(verified.verificationStatus, 'VERIFIED');
    assert.strictEqual(verified.isVerified, true);

    // Slot generation should now succeed
    const slots = await availabilityService.generateSlots(createdDoctorId, 2);
    assert.ok(slots.length > 0);
  });

  it('should allow admin to update and delete doctor', async () => {
    const updated = await doctorsService.updateDoctor(createdDoctorId, {
      consultationFee: 700,
    });
    assert.strictEqual(updated.consultationFee, 700);

    const deleteRes = await doctorsService.deleteDoctor(createdDoctorId);
    assert.strictEqual(deleteRes.success, true);
  });

  it('should allow admin to list and update patient profiles', async () => {
    const patients = await patientsService.listPatients();
    assert.ok(patients.length > 0);

    const target = patients[0];
    const updated = await patientsService.updatePatientProfile(target.id, {
      phone: '+91 99999 88888',
      prakritiType: 'PITTA_KAPHA',
    });

    assert.strictEqual(updated.phone, '+91 99999 88888');
    assert.strictEqual(updated.prakritiType, 'PITTA_KAPHA');
  });
});
