import { ConvexError } from 'convex/values';
import type { QueryCtx, MutationCtx } from './_generated/server';

type Context = Pick<QueryCtx | MutationCtx, 'auth' | 'db'>;
export async function requireIdentity(ctx: Pick<QueryCtx, 'auth'>) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Authentication required');
  return identity;
}
export async function roleFor(ctx: Context, subject: string) {
  const roles = await ctx.db.query('user_roles').withIndex('by_userId', q => q.eq('userId', subject)).collect();
  return roles.some(r => r.role === 'admin') ? 'admin' : roles.some(r => r.role === 'instructor') ? 'instructor' : 'student';
}
export async function requireRole(ctx: Context, allowed: readonly string[]) {
  const identity = await requireIdentity(ctx);
  const role = await roleFor(ctx, identity.subject);
  if (!allowed.includes(role)) throw new ConvexError('Permission denied');
  return { identity, role };
}
export const requireAdmin = (ctx: Context) => requireRole(ctx, ['admin']);
export const requireFaculty = (ctx: Context) => requireRole(ctx, ['admin', 'instructor']);
/** Compatibility endpoints accept userId, but never use it as authority. */
export async function requireOwner(ctx: Context, submittedUserId: string) {
  const identity = await requireIdentity(ctx);
  if (identity.subject !== submittedUserId) throw new ConvexError('Permission denied');
  return identity.subject;
}
