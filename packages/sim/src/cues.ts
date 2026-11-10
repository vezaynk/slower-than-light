/** Death cry name for a crew race. Playback stays in the app. */
export function deathCue(kin: string | undefined, sex?: "male" | "female"): string {
  if (kin === "rock") return "rockDeath";
  if (kin === "mantis") return "mantisDeath";
  if (kin === "crystal") return "crystalDeath";
  if (kin === "engi") return "engiDeath";
  if (kin === "energy") return "energyDeath";
  return sex === "female" ? "femaleDeath" : "death";
}
