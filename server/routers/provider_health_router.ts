import { protectedProcedure, router } from "../_core/trpc";
import { checkProviderHealth } from "../services/provider_health";

export const providerHealthRouter = router({
  check: protectedProcedure.query(async () => {
    return checkProviderHealth();
  }),
});
