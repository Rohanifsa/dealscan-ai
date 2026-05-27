import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createServerClient } from "@/lib/supabase/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return {
    supabase,
    user,
    profile,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!ctx.profile) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Profile not found" });
  }
  return next({ ctx: { ...ctx, user: ctx.user, profile: ctx.profile } });
});
