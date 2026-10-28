import type { HandoffEnv } from "./env.ts";
import { handle } from "./http.ts";

export { HandoffRoom } from "./room-object.ts";

export default {
  async fetch(request: Request, env: HandoffEnv): Promise<Response> {
    return handle(request, env, env.ROOMS);
  },
};
