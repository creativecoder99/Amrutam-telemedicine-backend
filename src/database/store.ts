import crypto from 'crypto';
import { pool, checkDatabaseHealth } from '../config/database.js';
import { logger } from '../config/logger.js';
import { computeAuditHash, generateHmacSignature, encryptData } from '../utils/crypto.js';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'AUDITOR';
  mfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: string;
}

export interface UserProfileEntity {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  gender: string;
  dateOfBirth?: string;
  prakritiType?: string;
  address?: string;
  emergencyContact?: string;
}

export interface DoctorEntity {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  qualification: string;
  primarySpecialty: string;
  secondarySpecialties: string[];
  experienceYears: number;
  bio: string;
  consultationFee: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  licenseDocumentUrl?: string;
  qualificationDocumentUrl?: string;
  idProofUrl?: string;
  rejectionReason?: string;
}

export interface WalletEntity {
  id: string;
  doctorId: string;
  balance: number;
  totalEarned: number;
  updatedAt: string;
}

export interface PayoutRequestEntity {
  id: string;
  doctorId: string;
  doctorName?: string;
  amount: number;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  accountDetails: {
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
}

export interface AvailabilitySlotEntity {
  id: string;
  doctorId: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
  heldByPatientId?: string;
  holdExpiresAt?: string;
}

export interface ConsultationEntity {
  id: string;
  patientId: string;
  doctorId: string;
  slotId?: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: 'SCHEDULED' | 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  encryptedSoapNotes?: string;
  roomSessionToken: string;
  createdAt: string;
}

export interface PrescriptionItemEntity {
  id: string;
  prescriptionId: string;
  medicineName: string;
  formulation: string;
  dosage: string;
  frequency: string;
  anupana: string;
  durationDays: number;
  specialInstructions?: string;
}

export interface PrescriptionEntity {
  id: string;
  consultationId: string;
  doctorId: string;
  patientId: string;
  diagnosisNotes: string;
  dietaryAdvice: string;
  lifestyleInstructions: string;
  digitalSignature: string;
  signedAt: string;
  isFinalized: boolean;
  items: PrescriptionItemEntity[];
}

export interface AuditLogEntity {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  previousHash: string;
  recordHash: string;
  createdAt: string;
}

export interface IdempotencyRecord {
  key: string;
  userId?: string;
  requestPath: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  responseStatus?: number;
  responseBody?: any;
  expiresAt: string;
}

// In-Memory Master Store initialized with Authentic Seed Data
class MemoryStore {
  public users: Map<string, UserEntity> = new Map();
  public profiles: Map<string, UserProfileEntity> = new Map();
  public doctors: Map<string, DoctorEntity> = new Map();
  public slots: Map<string, AvailabilitySlotEntity> = new Map();
  public consultations: Map<string, ConsultationEntity> = new Map();
  public prescriptions: Map<string, PrescriptionEntity> = new Map();
  public auditLogs: AuditLogEntity[] = [];
  public idempotencyKeys: Map<string, IdempotencyRecord> = new Map();
  public wallets: Map<string, WalletEntity> = new Map(); // doctorId -> WalletEntity
  public payoutRequests: Map<string, PayoutRequestEntity> = new Map(); // id -> PayoutRequestEntity

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Users
    const u1: UserEntity = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'dr.rajesh@amrutam.co.in',
      passwordHash: '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu', // Amrutam@123
      role: 'DOCTOR',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
      createdAt: new Date().toISOString(),
    };
    const u2: UserEntity = {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'dr.ananya@amrutam.co.in',
      passwordHash: '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu',
      role: 'DOCTOR',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
      createdAt: new Date().toISOString(),
    };
    const u3: UserEntity = {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'dr.vikramaditya@amrutam.co.in',
      passwordHash: '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu',
      role: 'DOCTOR',
      mfaEnabled: true,
      createdAt: new Date().toISOString(),
    };
    const u4: UserEntity = {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'dr.priya@amrutam.co.in',
      passwordHash: '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu',
      role: 'DOCTOR',
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    };
    const u5: UserEntity = {
      id: '55555555-5555-5555-5555-555555555555',
      email: 'patient.arjun@gmail.com',
      passwordHash: '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu',
      role: 'PATIENT',
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    };
    const u6: UserEntity = {
      id: '66666666-6666-6666-6666-666666666666',
      email: 'admin@amrutam.co.in',
      passwordHash: '$2a$10$wW5V68O4oA3G6iG8e6z16eZ3xJ2h3iK9q8z.w12w4K8pL9x7a5bCu',
      role: 'ADMIN',
      mfaEnabled: true,
      createdAt: new Date().toISOString(),
    };

    [u1, u2, u3, u4, u5, u6].forEach((u) => this.users.set(u.id, u));

    // 2. Profiles
    this.profiles.set(u1.id, {
      id: 'p1',
      userId: u1.id,
      fullName: 'Dr. Vaidya Rajesh Sharma',
      phone: '+91 98200 11223',
      gender: 'MALE',
      prakritiType: 'PITTA_KAPHA',
    });
    this.profiles.set(u2.id, {
      id: 'p2',
      userId: u2.id,
      fullName: 'Dr. Vaidya Ananya Deshmukh',
      phone: '+91 98200 44556',
      gender: 'FEMALE',
      prakritiType: 'VATA_PITTA',
    });
    this.profiles.set(u3.id, {
      id: 'p3',
      userId: u3.id,
      fullName: 'Dr. Vaidya Vikramaditya Joshi',
      phone: '+91 98200 77889',
      gender: 'MALE',
      prakritiType: 'TRIDOSHIC',
    });
    this.profiles.set(u4.id, {
      id: 'p4',
      userId: u4.id,
      fullName: 'Dr. Vaidya Priya Nair',
      phone: '+91 98200 99001',
      gender: 'FEMALE',
      prakritiType: 'PITTA',
    });
    this.profiles.set(u5.id, {
      id: 'p5',
      userId: u5.id,
      fullName: 'Arjun Verma',
      phone: '+91 98765 43210',
      gender: 'MALE',
      prakritiType: 'VATA',
    });

    // 3. Doctors
    const doc1: DoctorEntity = {
      id: 'd1111111-1111-1111-1111-111111111111',
      userId: u1.id,
      fullName: 'Dr. Vaidya Rajesh Sharma',
      email: u1.email,
      licenseNumber: 'AY-NMC-2009-4821',
      qualification: 'BAMS, MD (Ayurveda) - Kayachikitsa',
      primarySpecialty: 'Kayachikitsa (Internal Medicine)',
      secondarySpecialties: ['Digestive Disorders', 'Metabolic Syndrome', 'Agni Deepana'],
      experienceYears: 15,
      bio: 'Senior Ayurvedic Physician with 15 years of clinical mastery in gut health, chronic acidity, IBS, and metabolic harmony through classical herbal formulations.',
      consultationFee: 650,
      rating: 4.95,
      reviewCount: 342,
      isVerified: true,
      verificationStatus: 'VERIFIED',
      licenseDocumentUrl: 'https://amrutam.co.in/docs/license_rajesh.pdf',
    };
    const doc2: DoctorEntity = {
      id: 'd2222222-2222-2222-2222-222222222222',
      userId: u2.id,
      fullName: 'Dr. Vaidya Ananya Deshmukh',
      email: u2.email,
      licenseNumber: 'AY-CCIM-2012-8812',
      qualification: 'BAMS, MS (Ayurveda) - Shalakya Tantra',
      primarySpecialty: 'Shalakya Tantra (ENT & Eye Care)',
      secondarySpecialties: ['Migraine Management', 'Sinusitis', 'Computer Vision Syndrome'],
      experienceYears: 12,
      bio: 'Renowned practitioner specializing in supra-clavicular disorders, chronic sinusitis, tension migraines, and holistic eye therapies like Netra Tarpana guidance.',
      consultationFee: 750,
      rating: 4.92,
      reviewCount: 218,
      isVerified: true,
      verificationStatus: 'VERIFIED',
      licenseDocumentUrl: 'https://amrutam.co.in/docs/license_ananya.pdf',
    };
    const doc3: DoctorEntity = {
      id: 'd3333333-3333-3333-3333-333333333333',
      userId: u3.id,
      fullName: 'Dr. Vaidya Vikramaditya Joshi',
      email: u3.email,
      licenseNumber: 'AY-NMC-2006-1029',
      qualification: 'BAMS, Fellowship in Panchakarma (Kerala)',
      primarySpecialty: 'Panchakarma (Detoxification)',
      secondarySpecialties: ['Joint Pain & Arthritis', 'Stress & Insomnia', 'Cellular Rejuvenation'],
      experienceYears: 18,
      bio: 'Gold medalist in classical Panchakarma therapy. Guides structured home-based Shamana treatments and post-cleansing Rasayana rejuvenation regimens.',
      consultationFee: 900,
      rating: 4.98,
      reviewCount: 480,
      isVerified: true,
      verificationStatus: 'VERIFIED',
      licenseDocumentUrl: 'https://amrutam.co.in/docs/license_vikramaditya.pdf',
    };
    const doc4: DoctorEntity = {
      id: 'd4444444-4444-4444-4444-444444444444',
      userId: u4.id,
      fullName: 'Dr. Vaidya Priya Nair',
      email: u4.email,
      licenseNumber: 'AY-CCIM-2014-6102',
      qualification: 'BAMS, Diploma in Prasuti & Stri Roga',
      primarySpecialty: 'Prasuti & Stri Roga (Women Health)',
      secondarySpecialties: ['PCOS/PCOD Care', 'Hormonal Balance', 'Postpartum Wellness'],
      experienceYears: 10,
      bio: 'Dedicated women health specialist integrating gentle herbs, cycle sync nutrition, and mindfulness for long-term endocrine balance.',
      consultationFee: 600,
      rating: 4.88,
      reviewCount: 195,
      isVerified: true,
      verificationStatus: 'VERIFIED',
      licenseDocumentUrl: 'https://amrutam.co.in/docs/license_priya.pdf',
    };

    // 5. Seed a Doctor Pending Admin Verification
    const doc5: DoctorEntity = {
      id: 'd5555555-5555-5555-5555-555555555555',
      userId: 'u-pending-doc-01',
      fullName: 'Dr. Vaidya Kavyanjali Sen',
      email: 'dr.kavyanjali@amrutam.co.in',
      licenseNumber: 'AY-NMC-2024-9102',
      qualification: 'BAMS, MD (Ayurveda) - Dravyaguna',
      primarySpecialty: 'Dravyaguna (Herbal Pharmacology)',
      secondarySpecialties: ['Herbal Drug Safety', 'Plant Therapeutics', 'Rasayana'],
      experienceYears: 7,
      bio: 'Ayurvedic pharmacologist and practitioner focusing on personalized herbal dosages, pure single-herb synergies, and immune rejuvenation.',
      consultationFee: 550,
      rating: 5.0,
      reviewCount: 0,
      isVerified: false,
      verificationStatus: 'PENDING_VERIFICATION',
      licenseDocumentUrl: 'https://amrutam.co.in/docs/verification_kavyanjali_license.pdf',
      qualificationDocumentUrl: 'https://amrutam.co.in/docs/degree_kavyanjali_bams_md.pdf',
      idProofUrl: 'https://amrutam.co.in/docs/id_proof_kavyanjali_aadhaar.pdf',
    };

    [doc1, doc2, doc3, doc4, doc5].forEach((d) => this.doctors.set(d.id, d));

    // Seed Doctor Remuneration Wallets (Doctor earns ₹200 per patient consultation)
    // Dr. Rajesh Sharma has completed consultations and balance >= 1000 so payout request can be tested
    this.wallets.set(doc1.id, {
      id: 'w1',
      doctorId: doc1.id,
      balance: 1200.0,
      totalEarned: 1200.0,
      updatedAt: new Date().toISOString(),
    });
    this.wallets.set(doc2.id, {
      id: 'w2',
      doctorId: doc2.id,
      balance: 600.0,
      totalEarned: 600.0,
      updatedAt: new Date().toISOString(),
    });
    this.wallets.set(doc3.id, {
      id: 'w3',
      doctorId: doc3.id,
      balance: 800.0,
      totalEarned: 800.0,
      updatedAt: new Date().toISOString(),
    });
    this.wallets.set(doc4.id, {
      id: 'w4',
      doctorId: doc4.id,
      balance: 400.0,
      totalEarned: 400.0,
      updatedAt: new Date().toISOString(),
    });
    this.wallets.set(doc5.id, {
      id: 'w5',
      doctorId: doc5.id,
      balance: 0.0,
      totalEarned: 0.0,
      updatedAt: new Date().toISOString(),
    });

    // 4. Generate Rolling 7-day Slots for each Doctor (09:00 - 18:00)
    const doctorList = [doc1, doc2, doc3, doc4];
    const baseDate = new Date();
    baseDate.setMinutes(0, 0, 0);

    let slotCounter = 1;
    for (const doc of doctorList) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const slotDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        // Generate slots at 10:00, 11:30, 14:00, 15:30, 17:00
        const hours = [10, 11.5, 14, 15.5, 17];
        for (const h of hours) {
          const start = new Date(slotDate);
          start.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
          const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration

          const slotId = `slot-${doc.id.slice(0, 4)}-${dayOffset}-${Math.floor(h)}-${slotCounter++}`;
          this.slots.set(slotId, {
            id: slotId,
            doctorId: doc.id,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            status: 'AVAILABLE',
          });
        }
      }
    }

    // 5. Sample Consultation and Digital Prescription
    const c1: ConsultationEntity = {
      id: 'c1111111-1111-1111-1111-111111111111',
      patientId: u5.id,
      doctorId: doc1.id,
      scheduledStartTime: new Date(Date.now() - 3600000).toISOString(),
      scheduledEndTime: new Date(Date.now() - 1800000).toISOString(),
      status: 'COMPLETED',
      encryptedSoapNotes: encryptData(
        'S: Patient reports chronic bloating, postprandial acidity, erratic appetite. ' +
        'O: Jihva (tongue) has mild Sama coating. Nadi: Pitta-dominant with Vata tick. ' +
        'A: Agnimandya and Amlapitta due to Vishamashana. ' +
        'P: Deepana-Pachana therapy, Pitta-shamak diet, warm CCF water.'
      ),
      roomSessionToken: crypto.randomUUID(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    };
    this.consultations.set(c1.id, c1);

    const prescriptionCanonical = `${c1.id}|${doc1.id}|${u5.id}|Amlapitta & Agnimandya|1700000000000`;
    const signature = generateHmacSignature(prescriptionCanonical);

    const p1: PrescriptionEntity = {
      id: 'rx111111-1111-1111-1111-111111111111',
      consultationId: c1.id,
      doctorId: doc1.id,
      patientId: u5.id,
      diagnosisNotes: 'Amlapitta & Agnimandya (Digestive fire imbalance with Pitta vitiation)',
      dietaryAdvice: 'Favor warm cooked foods, basmati rice, bottle gourd, mung dal. Strictly avoid deep-fried food, curd at night, red chili, and caffeinated beverages.',
      lifestyleInstructions: 'Practice Sheetali Pranayama for 10 minutes before meals. Sleep before 10:30 PM. Walk 100 paces after dinner.',
      digitalSignature: signature,
      signedAt: new Date(Date.now() - 1800000).toISOString(),
      isFinalized: true,
      items: [
        {
          id: 'item-1',
          prescriptionId: 'rx111111-1111-1111-1111-111111111111',
          medicineName: 'Avipattikar Churna',
          formulation: 'Classical Herbal Powder (Churna)',
          dosage: '3 grams (1 teaspoon)',
          frequency: 'Twice daily, 15 minutes before meals',
          anupana: 'Warm water or lukewarm coconut water',
          durationDays: 21,
          specialInstructions: 'Do not skip doses. Store away from moisture.',
        },
        {
          id: 'item-2',
          prescriptionId: 'rx111111-1111-1111-1111-111111111111',
          medicineName: 'Amrutam Kuntal Care Tablet / Shankh Bhasma Blend',
          formulation: 'Vati / Tablet',
          dosage: '1 tablet (500mg)',
          frequency: 'After lunch and dinner',
          anupana: 'Warm cow milk or lukewarm water',
          durationDays: 30,
          specialInstructions: 'Helps balance stomach acid and gut lining.',
        },
      ],
    };
    this.prescriptions.set(p1.id, p1);

    // 6. Genesis Audit Log
    const genesisTime = new Date().toISOString();
    const genesisPrev = '0000000000000000000000000000000000000000000000000000000000000000';
    const genesisHash = computeAuditHash(
      'SYSTEM_GENESIS_INITIALIZE',
      'SYSTEM',
      'GENESIS',
      u6.id,
      genesisTime,
      genesisPrev
    );

    this.auditLogs.push({
      id: crypto.randomUUID(),
      userId: u6.id,
      action: 'SYSTEM_GENESIS_INITIALIZE',
      resource: 'SYSTEM',
      resourceId: 'GENESIS',
      previousHash: genesisPrev,
      recordHash: genesisHash,
      createdAt: genesisTime,
    });
  }

  // Auto-expire holds past 10 minutes
  public cleanExpiredHolds() {
    const now = new Date().toISOString();
    for (const slot of this.slots.values()) {
      if (slot.status === 'HELD' && slot.holdExpiresAt && slot.holdExpiresAt < now) {
        slot.status = 'AVAILABLE';
        slot.heldByPatientId = undefined;
        slot.holdExpiresAt = undefined;
      }
    }
  }

  // Append new tamper-evident audit record
  public appendAuditLog(action: string, resource: string, resourceId: string, userId?: string, ip?: string, ua?: string) {
    const prev = this.auditLogs.length > 0 ? this.auditLogs[this.auditLogs.length - 1].recordHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const createdAt = new Date().toISOString();
    const hash = computeAuditHash(action, resource, resourceId, userId || 'ANONYMOUS', createdAt, prev);

    const log: AuditLogEntity = {
      id: crypto.randomUUID(),
      userId,
      action,
      resource,
      resourceId,
      ipAddress: ip,
      userAgent: ua,
      previousHash: prev,
      recordHash: hash,
      createdAt,
    };
    this.auditLogs.push(log);
    return log;
  }

  // Credit doctor remuneration wallet (₹200 per completed consultation)
  public creditDoctorWallet(doctorId: string, amount: number = 200) {
    let wallet = this.wallets.get(doctorId);
    if (!wallet) {
      wallet = {
        id: crypto.randomUUID(),
        doctorId,
        balance: 0,
        totalEarned: 0,
        updatedAt: new Date().toISOString(),
      };
      this.wallets.set(doctorId, wallet);
    }
    wallet.balance += amount;
    wallet.totalEarned += amount;
    wallet.updatedAt = new Date().toISOString();
    return wallet;
  }

  // Delete doctor profile and associated slots
  public deleteDoctor(doctorId: string) {
    this.doctors.delete(doctorId);
    this.wallets.delete(doctorId);
    // Remove slots associated with doctor
    for (const [slotId, slot] of this.slots.entries()) {
      if (slot.doctorId === doctorId) {
        this.slots.delete(slotId);
      }
    }
    return true;
  }

  // Delete patient and associated profile
  public deletePatient(patientId: string) {
    this.users.delete(patientId);
    this.profiles.delete(patientId);
    return true;
  }
}

export const dbStore = new MemoryStore();
