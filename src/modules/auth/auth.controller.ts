import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './auth.service.js';
import { ValidationError } from '../../core/errors.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['PATIENT', 'DOCTOR']).optional(),
  prakritiType: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
});

const mfaSchema = z.object({
  userId: z.string(),
  code: z.string().length(6),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid registration parameters', parsed.error.format());
      }
      const result = await authService.register(parsed.data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid login credentials structure', parsed.error.format());
      }
      const result = await authService.login(parsed.data.email, parsed.data.password);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = mfaSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid MFA code payload', parsed.error.format());
      }
      const result = await authService.verifyMfa(parsed.data.userId, parsed.data.code);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken;
      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }
      const result = await authService.refreshToken(refreshToken);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.getMe(req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
