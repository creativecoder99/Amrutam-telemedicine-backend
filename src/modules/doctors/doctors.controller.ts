import { Request, Response, NextFunction } from 'express';
import { doctorsService } from './doctors.service.js';
import { ValidationError } from '../../core/errors.js';

export class DoctorsController {
  async listDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const { specialty, maxFee, minRating, q, status } = req.query;
      const doctors = await doctorsService.listDoctors({
        specialty: specialty as string,
        maxFee: maxFee ? Number(maxFee) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        searchQuery: q as string,
        status: status as any,
      });
      res.status(200).json({ data: doctors, total: doctors.length });
    } catch (err) {
      next(err);
    }
  }

  async getDoctorById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const doctor = await doctorsService.getDoctorById(id);
      res.status(200).json(doctor);
    } catch (err) {
      next(err);
    }
  }

  async createDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        fullName,
        email,
        licenseNumber,
        qualification,
        primarySpecialty,
        secondarySpecialties,
        experienceYears,
        bio,
        consultationFee,
        licenseDocumentUrl,
        qualificationDocumentUrl,
        idProofUrl,
        isAdminCreated,
      } = req.body;

      if (!fullName || !email || !licenseNumber || !qualification || !primarySpecialty) {
        throw new ValidationError('Missing required fields: fullName, email, licenseNumber, qualification, primarySpecialty');
      }

      const doctor = await doctorsService.createDoctor({
        userId: req.user?.id,
        fullName,
        email,
        licenseNumber,
        qualification,
        primarySpecialty,
        secondarySpecialties,
        experienceYears: Number(experienceYears) || 1,
        bio,
        consultationFee: Number(consultationFee) || 500,
        licenseDocumentUrl,
        qualificationDocumentUrl,
        idProofUrl,
        isAdminCreated: Boolean(isAdminCreated),
      });

      res.status(201).json(doctor);
    } catch (err) {
      next(err);
    }
  }

  async verifyDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, rejectionReason } = req.body;

      if (!['VERIFIED', 'REJECTED'].includes(status)) {
        throw new ValidationError("Verification status must be either 'VERIFIED' or 'REJECTED'");
      }

      const updated = await doctorsService.verifyDoctor(doctorId, status, rejectionReason);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async updateDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await doctorsService.updateDoctor(doctorId, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async deleteDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await doctorsService.deleteDoctor(doctorId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const doctorsController = new DoctorsController();
