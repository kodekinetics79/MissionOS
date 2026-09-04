import { authenticator } from 'otplib';
import { prisma } from '../utils/prisma.js';

// TOTP (RFC 6238) multi-factor authentication. Secrets are stored per user; a
// pending secret is held during enrollment and only promoted once the user proves
// possession by entering a valid code. Admin enforcement is policy-gated below.
authenticator.options = { window: 1 }; // tolerate ±1 step (30s) clock skew

const ISSUER = 'MissionOS';

function isAdmin(permissions: string[] = []) {
  return permissions.some((p) => p.startsWith('admin.'));
}

// Whether MFA is *required* for this user (admins, when the policy is enabled).
// Default OFF for the demo environment. When enabled, auth middleware restricts
// unenrolled privileged users to MFA enrollment/status/me/logout until activated.
export function adminMfaRequired(permissions: string[] = [], mfaEnabled = false) {
  if (mfaEnabled) return false;
  return process.env.MFA_REQUIRED_FOR_ADMIN === 'true' && isAdmin(permissions);
}

export function verifyTotp(secret: string, token: string) {
  try {
    return authenticator.verify({ token: String(token).replace(/\s/g, ''), secret });
  } catch {
    return false;
  }
}

export const mfaService = {
  async status(tenantId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { tenantId, id: userId } });
    // "Enabled" means a real TOTP secret is configured (not just a cosmetic flag).
    return { enabled: Boolean(user?.mfaEnabled && user?.mfaSecret), pending: Boolean(user?.mfaPendingSecret) };
  },

  // Begin enrollment: generate a secret + otpauth URI. Not active until activated.
  async setup(tenantId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { tenantId, id: userId } });
    if (!user) throw new Error('not found');
    const secret = authenticator.generateSecret();
    await prisma.user.update({ where: { id: userId }, data: { mfaPendingSecret: secret, updatedAt: new Date().toISOString() } });
    const otpauth = authenticator.keyuri(user.email, ISSUER, secret);
    return { secret, otpauth, issuer: ISSUER, account: user.email };
  },

  // Prove possession of the pending secret, then enable MFA.
  async activate(tenantId: string, userId: string, token: string) {
    const user = await prisma.user.findFirst({ where: { tenantId, id: userId } });
    // The shared demo administrator can be protected from accidental enrollment in
    // non-production demos. Production NEVER protects a default account: an
    // operator must explicitly set MFA_PROTECT_EMAILS if they accept that risk.
    const defaultProtected = process.env.NODE_ENV === 'production' ? '' : 'admin@westmetro.example';
    const protectedEmails = (process.env.MFA_PROTECT_EMAILS ?? defaultProtected)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (user && protectedEmails.includes(user.email)) {
      const e: any = new Error('MFA enrollment is disabled for this protected demo account. Create a user and enroll them to demonstrate MFA.'); e.status = 400; throw e;
    }
    if (!user?.mfaPendingSecret) throw new Error('No pending MFA enrollment. Start setup first.');
    if (!verifyTotp(user.mfaPendingSecret, token)) {
      const err: any = new Error('Invalid MFA code'); err.status = 401; throw err;
    }
    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: user.mfaPendingSecret, mfaPendingSecret: null, mfaEnabled: true, updatedAt: new Date().toISOString() } });
    return { enabled: true };
  },

  async disable(tenantId: string, userId: string, token: string) {
    const user = await prisma.user.findFirst({ where: { tenantId, id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecret) return { enabled: false };
    if (!verifyTotp(user.mfaSecret, token)) {
      const err: any = new Error('Invalid MFA code'); err.status = 401; throw err;
    }
    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: null, mfaPendingSecret: null, mfaEnabled: false, updatedAt: new Date().toISOString() } });
    return { enabled: false };
  },
};
