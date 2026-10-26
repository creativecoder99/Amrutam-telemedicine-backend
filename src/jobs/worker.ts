import { logger } from '../config/logger.js';

export interface BackgroundJob {
  id: string;
  type: 'GENERATE_PRESCRIPTION_PDF' | 'DISPATCH_PATIENT_SMS' | 'RECONCILE_EXPIRED_HOLDS';
  data: Record<string, unknown>;
  createdAt: string;
}

export class BackgroundWorker {
  private queue: BackgroundJob[] = [];
  private isProcessing = false;

  public dispatch(type: BackgroundJob['type'], data: Record<string, unknown>) {
    const job: BackgroundJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      data,
      createdAt: new Date().toISOString(),
    };
    this.queue.push(job);
    logger.info({ jobId: job.id, type: job.type }, 'Background job enqueued');
    this.processNext();
    return job.id;
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const job = this.queue.shift();
    if (!job) {
      this.isProcessing = false;
      return;
    }

    try {
      logger.info({ jobId: job.id, type: job.type }, 'Processing background job');
      // Simulate async processing (e.g., PDF generation, SMS notification)
      await new Promise((resolve) => setTimeout(resolve, 100));
      logger.info({ jobId: job.id, type: job.type }, 'Background job completed successfully');
    } catch (err) {
      logger.error({ jobId: job.id, err }, 'Background job failed');
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        this.processNext();
      }
    }
  }
}

export const backgroundWorker = new BackgroundWorker();
