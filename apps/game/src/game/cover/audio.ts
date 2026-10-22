import { archiveAudioPlays } from "../archive-audio.ts";
import { registerCoverExtra } from "../archive-cover-extra.ts";

/** Keep id "audio". True only for a path `playArchiveAudio` names. */
registerCoverExtra({
  id: "audio",
  playsAudio(file) {
    return archiveAudioPlays(file);
  },
});
