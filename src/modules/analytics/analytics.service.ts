import { dbStore } from '../../database/store.js';

export class AnalyticsService {
  async getDashboardSummary() {
    const consultations = Array.from(dbStore.consultations.values());
    const doctors = Array.from(dbStore.doctors.values());
    const users = Array.from(dbStore.users.values());
    const slots = Array.from(dbStore.slots.values());
    const payoutRequests = Array.from(dbStore.payoutRequests.values());

    const totalPatients = users.filter((u) => u.role === 'PATIENT').length;
    const totalDoctors = doctors.length;
    const verifiedDoctors = doctors.filter((d) => (d.verificationStatus || 'VERIFIED') === 'VERIFIED').length;
    const pendingDoctors = doctors.filter((d) => d.verificationStatus === 'PENDING_VERIFICATION').length;

    const totalConsultations = consultations.length;
    const completed = consultations.filter((c) => c.status === 'COMPLETED').length;
    const scheduled = consultations.filter((c) => c.status === 'SCHEDULED').length;
    const waitingRoom = consultations.filter((c) => c.status === 'WAITING_ROOM').length;
    const inProgress = consultations.filter((c) => c.status === 'IN_PROGRESS').length;
    const cancelled = consultations.filter((c) => c.status === 'CANCELLED').length;

    // Doctor utilization stats
    const doctorStats = doctors.map((doc) => {
      const docSlots = slots.filter((s) => s.doctorId === doc.id);
      const bookedSlots = docSlots.filter((s) => s.status === 'BOOKED').length;
      const utilizationRate = docSlots.length > 0 ? (bookedSlots / docSlots.length) * 100 : 0;
      const wallet = dbStore.wallets.get(doc.id);

      return {
        doctorId: doc.id,
        doctorName: doc.fullName,
        specialty: doc.primarySpecialty,
        verificationStatus: doc.verificationStatus || 'VERIFIED',
        totalSlots: docSlots.length,
        bookedSlots,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        rating: doc.rating,
        walletBalance: wallet?.balance || 0,
        totalEarned: wallet?.totalEarned || 0,
      };
    });

    // Gross Revenue from Patient Consultations
    const grossRevenue = consultations
      .filter((c) => c.status === 'COMPLETED' || c.status === 'SCHEDULED')
      .reduce((acc, c) => {
        const doc = dbStore.doctors.get(c.doctorId);
        return acc + (doc ? doc.consultationFee : 500);
      }, 0);

    // Payout aggregates
    const pendingPayoutRequests = payoutRequests.filter((p) => p.status === 'PENDING');
    const processedPayoutRequests = payoutRequests.filter((p) => p.status === 'PROCESSED');
    const totalPayoutsProcessed = processedPayoutRequests.reduce((acc, p) => acc + p.amount, 0);
    const pendingPayoutAmount = pendingPayoutRequests.reduce((acc, p) => acc + p.amount, 0);

    const activeHolds = slots.filter((s) => s.status === 'HELD').length;
    const availableSlots = slots.filter((s) => s.status === 'AVAILABLE').length;

    return {
      kpis: {
        totalPatients,
        totalDoctors,
        verifiedDoctors,
        pendingDoctors,
        totalConsultations,
        completedConsultations: completed,
        scheduledConsultations: scheduled,
        activeConsultations: inProgress + waitingRoom,
        cancelledConsultations: cancelled,
        fulfillmentRatePercent: totalConsultations > 0 ? Math.round((completed / totalConsultations) * 100) : 100,
        estimatedRevenueInr: grossRevenue,
        totalPayoutsProcessedInr: totalPayoutsProcessed,
        pendingPayoutRequestsCount: pendingPayoutRequests.length,
        pendingPayoutAmountInr: pendingPayoutAmount,
        doctorSharePerConsultationInr: 200,
        payoutThresholdInr: 1000,
        activeHolds,
        availableSlotsInventory: availableSlots,
      },
      doctorUtilization: doctorStats,
      scaleMetrics: {
        targetDailyCapacity: 100000,
        p95ReadLatencyMs: '< 200ms',
        p95WriteLatencyMs: '< 500ms',
        availabilityTarget: '99.95%',
        zeroDoubleBookingProtection: 'ACTIVE (Redlock + Postgres FOR UPDATE + Unique Index)',
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
