export const formatUser = (user: any) => {
    return {
        id: user._id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role?.name || user.role,
        isActive: user.isActive
    };
};

export const calculateEndDate = (start: Date, interval: string): Date => {
    const end = new Date(start);

    if (interval === 'month') {
        end.setMonth(end.getMonth() + 1);
    } else if (interval === 'year') {
        end.setFullYear(end.getFullYear() + 1);
    }

    return end;
}


export function formatSubscription(sub: any) {

  return {
    id: sub._id?.toString(),

    user: sub.user?.name || null,
    userEmail: sub.user?.email || null,

    plan: sub.plan?.name || null,
    planPrice: sub.plan?.price || null,
    planInterval: sub.plan?.interval || null,

    status: sub.status,

    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,

    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,

    stripeSubscriptionId: sub.stripeSubscriptionId,
  };
}

export function formatPayment(p: any) {
  return {
    id: p._id?.toString(),
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    paidAt: p.paidAt,
    stripePaymentIntentId: p.stripePaymentIntentId,
    stripeInvoiceId: p.stripeInvoiceId,
  };
}

export function formatPayments(payments: any[]) {
  return payments.map(formatPayment);
}