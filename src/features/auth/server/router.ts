import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/trpc/init";

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(async ({ ctx }) => {
    return { user: ctx.user ?? null };
  }),

  getUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});
