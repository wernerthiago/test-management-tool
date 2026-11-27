import { NOT_ADMIN_ERR_MSG, PASSWORD_CHANGE_REQUIRED_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/** Logged in, even if the user still has to replace a temporary password. Only for auth endpoints. */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Logged in with a password the user chose. Every app feature uses this. */
export const protectedProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.mustChangePassword) {
    throw new TRPCError({ code: "FORBIDDEN", message: PASSWORD_CHANGE_REQUIRED_MSG });
  }
  return next();
});

/** Admin panel only. */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  return next();
});
