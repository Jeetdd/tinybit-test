import type { User } from '@supabase/supabase-js';

type NameSource = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
};

function cleanPart(value?: string | null) {
  return value?.trim() ?? '';
}

export function buildFullName(firstName?: string | null, lastName?: string | null) {
  return [cleanPart(firstName), cleanPart(lastName)].filter(Boolean).join(' ').trim();
}

export function splitFullName(fullName?: string | null) {
  const normalized = cleanPart(fullName).replace(/\s+/g, ' ');
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(' ');
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

export function deriveNamesFromUser(user?: User | null) {
  const metadata = user?.user_metadata ?? {};
  const firstName =
    cleanPart(metadata.first_name) ||
    cleanPart(metadata.given_name) ||
    splitFullName(metadata.full_name || metadata.name).firstName;
  const lastName =
    cleanPart(metadata.last_name) ||
    cleanPart(metadata.family_name) ||
    splitFullName(metadata.full_name || metadata.name).lastName;
  const fullName = buildFullName(firstName, lastName) || cleanPart(metadata.full_name || metadata.name);

  return { firstName, lastName, fullName };
}

export function getPreferredFirstName(source: NameSource) {
  const firstName = cleanPart(source.firstName);
  if (firstName) return firstName;

  const fromFullName = splitFullName(source.fullName).firstName;
  if (fromFullName) return fromFullName;

  const emailPrefix = cleanPart(source.email).split('@')[0] ?? '';
  const simplifiedEmailName = emailPrefix.split(/[._-]+/)[0]?.trim() ?? '';
  return simplifiedEmailName || 'Friend';
}

export function truncateName(name: string, maxLength = 14) {
  const normalized = cleanPart(name);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}
