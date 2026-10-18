import { query, mutation } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { requireAdmin, requireIdentity, roleFor } from './permissions';

export const current = query({ args: {}, handler: async ctx => {
  const identity = await ctx.auth.getUserIdentity();
  return identity ? { userId: identity.subject, role: await roleFor(ctx, identity.subject) } : null;
} });
export const setInstructor = mutation({ args: { userId: v.string(), enabled: v.boolean() }, handler: async (ctx, args) => {
  const { identity } = await requireAdmin(ctx);
  if (identity.subject === args.userId) throw new ConvexError('Cannot change your own permissions');
  const records = await ctx.db.query('user_roles').withIndex('by_userId', q => q.eq('userId', args.userId)).collect();
  if (records.some(r => r.role === 'admin')) throw new ConvexError('Administrator roles are managed by the university operator');
  for (const record of records) await ctx.db.delete(record._id);
  await ctx.db.insert('user_roles', { userId: args.userId, role: args.enabled ? 'instructor' : 'user' });
  await ctx.db.insert('training_audit', { actor: identity.subject, action: 'role', target: args.userId, detail: args.enabled ? 'instructor' : 'student', at: Date.now() });
} });
export const ensureProfile = mutation({ args: {}, handler: async ctx => {
  const identity = await requireIdentity(ctx);
  const existing = await ctx.db.query('profiles').withIndex('by_userId', q => q.eq('userId', identity.subject)).first();
  return existing?._id ?? ctx.db.insert('profiles', { userId: identity.subject, fullName: identity.name });
} });
