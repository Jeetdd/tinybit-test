import { supabase } from '../utils/supabase';

export type PlanType = 'free' | 'sathi_basic' | 'sathi_pro';
export type PlanStatus = 'active' | 'expired' | 'cancelled' | 'trial';
export type PlanInterval = 'month' | 'year';

export interface UserPlan {
  planType: PlanType;
  planStatus: PlanStatus;
  planStartedAt: string | null;
  planExpiresAt: string | null;
  planAmount: number | null;
  planCurrency: string;
  planInterval: PlanInterval | null;
}

export interface PlanDefinition {
  name: string;
  tagline: string;
  price: number;
  currency: string;
  interval: PlanInterval | null;
  features: string[];
  badge: string;
  badgeColor: string;
}

export const PLAN_DEFINITIONS: Record<PlanType, PlanDefinition> = {
  free: {
    name: 'TinyBit Free',
    tagline: 'Basic health tracking',
    price: 0,
    currency: 'INR',
    interval: null,
    features: [
      'Up to 3 medicine reminders',
      'Daily check-in & mood',
      'Sathi AI (10 messages/day)',
      'Memory journal',
      '1 family member',
    ],
    badge: 'Free',
    badgeColor: '#64B5F6',
  },
  sathi_basic: {
    name: 'Sathi Basic',
    tagline: 'For active health management',
    price: 299,
    currency: 'INR',
    interval: 'month',
    features: [
      'Unlimited medicine reminders',
      'Daily check-in & mood tracking',
      'Sathi AI (50 messages/day)',
      'Full journal with voice recording',
      'Up to 3 family members',
    ],
    badge: 'Basic',
    badgeColor: '#81C784',
  },
  sathi_pro: {
    name: 'Sathi Pro',
    tagline: 'Complete elder care companion',
    price: 799,
    currency: 'INR',
    interval: 'month',
    features: [
      'All 30 features unlocked',
      'Unlimited family members',
      'AI Health Watch 24/7',
      'WhatsApp bot in 6 languages',
      'Priority caregiver support',
    ],
    badge: 'Pro',
    badgeColor: '#FF8A65',
  },
};

export const DEFAULT_PLAN: UserPlan = {
  planType: 'free',
  planStatus: 'active',
  planStartedAt: null,
  planExpiresAt: null,
  planAmount: null,
  planCurrency: 'INR',
  planInterval: null,
};

export async function fetchUserPlan(userId: string): Promise<UserPlan> {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan_type, plan_status, plan_started_at, plan_expires_at, plan_amount, plan_currency, plan_interval')
    .eq('id', userId)
    .single();

  if (error || !data) return DEFAULT_PLAN;

  return {
    planType:      (data.plan_type as PlanType)         || 'free',
    planStatus:    (data.plan_status as PlanStatus)      || 'active',
    planStartedAt: data.plan_started_at  ?? null,
    planExpiresAt: data.plan_expires_at  ?? null,
    planAmount:    data.plan_amount      ?? null,
    planCurrency:  data.plan_currency    || 'INR',
    planInterval:  (data.plan_interval as PlanInterval) ?? null,
  };
}

export async function updateUserPlan(userId: string, plan: Partial<UserPlan>): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      plan_type:       plan.planType,
      plan_status:     plan.planStatus,
      plan_started_at: plan.planStartedAt,
      plan_expires_at: plan.planExpiresAt,
      plan_amount:     plan.planAmount,
      plan_currency:   plan.planCurrency,
      plan_interval:   plan.planInterval,
    })
    .eq('id', userId);
}

export function isPlanActive(plan: UserPlan): boolean {
  if (plan.planStatus !== 'active' && plan.planStatus !== 'trial') return false;
  if (plan.planExpiresAt && new Date(plan.planExpiresAt) < new Date()) return false;
  return true;
}

export function isPro(plan: UserPlan): boolean {
  return plan.planType === 'sathi_pro' && isPlanActive(plan);
}

export function isBasicOrAbove(plan: UserPlan): boolean {
  return (plan.planType === 'sathi_basic' || plan.planType === 'sathi_pro') && isPlanActive(plan);
}

export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.price === 0) return 'Free';
  const symbol = plan.currency === 'INR' ? '₹' : '$';
  return `${symbol}${plan.price}/${plan.interval}`;
}

export function formatRenewalDate(plan: UserPlan): string {
  if (!plan.planExpiresAt) return '';
  return new Date(plan.planExpiresAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
