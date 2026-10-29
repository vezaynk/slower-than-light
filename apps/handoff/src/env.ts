import type { RoomCaller } from "./http.ts";

export interface HandoffEnv {
  ROOMS: {
    getByName(name: string): RoomCaller;
  };
  REALTIME_SFU_APP_ID?: string;
  REALTIME_SFU_APP_SECRET?: string;
}
