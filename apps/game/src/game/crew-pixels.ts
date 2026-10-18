/**
 * Original crew figures. The archive sheets are painted from these rows.
 * h = skin, d = outline, e = eye, u = uniform. 12 wide; a punch may run wider.
 */
export const CREW_KIN = [
  "human",
  "engi",
  "energy",
  "mantis",
  "slug",
  "rock",
  "anaerobic",
  "crystal",
] as const;

export type CrewKin = (typeof CREW_KIN)[number];

const HEADS: Record<CrewKin, string[]> = {
  human: [
    "....dddd....",
    "...dhhhhd...",
    "..dhhhhhhd..",
    "..dhehhehd..",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
    "....dhhd....",
  ],
  engi: [
    ".d........d.",
    "..d......d..",
    "..dddddddd..",
    ".dhhhhhhhhd.",
    ".dheehheehd.",
    ".dhhhhhhhhd.",
    "..dddddddd..",
    "....dhhd....",
  ],
  energy: [
    "....dddd....",
    "...dheehd...",
    "..dhhhhhhd..",
    "..dhehhehd..",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
    "....dhhd....",
  ],
  mantis: [
    ".d........d.",
    "..d......d..",
    "..dddddddd..",
    ".dheehheehd.",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
    "....dhhd....",
  ],
  slug: [
    "..e......e..",
    "..d......d..",
    "..dhhhhhhd..",
    ".dhhehhehhd.",
    ".dhhhhhhhhd.",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
  ],
  rock: [
    "..dddddddd..",
    ".dhhhhhhhhd.",
    ".dhhhhhhhhd.",
    ".dheehheehd.",
    ".dhhhhhhhhd.",
    ".dhhhhhhhhd.",
    "..dddddddd..",
    "...dhhhhd...",
  ],
  anaerobic: [
    "...dddddd...",
    "..dhhhhhhd..",
    "..dhhhhhhd..",
    "..deeeeeed..",
    "..dhhhhhhd..",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
  ],
  crystal: [
    ".....dd.....",
    "....dhhd....",
    "...dhhhhd...",
    "..dhehhehd..",
    ".dhhhhhhhhd.",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
  ],
};

const BODY = ["...duuuud...", "..duuuuuud..", ".duuuuuuuud.", ".duuuuuuuud."];

function shiftRow(row: string, dx: number): string {
  if (dx === 0) return row;
  const out = Array.from({ length: row.length }, () => ".");
  for (let i = 0; i < row.length; i += 1) {
    if (row[i] === ".") continue;
    const j = i + dx;
    if (j >= 0 && j < row.length) out[j] = row[i] ?? ".";
  }
  return out.join("");
}

function legPose(dx: number): string[] {
  return [BODY[0] ?? "", BODY[1] ?? "", shiftRow(BODY[2] ?? "", dx), shiftRow(BODY[3] ?? "", dx)];
}

/** Four frames each. Idle breathing stays in the component; the archive uses these three. */
export const CREW_POSES: Record<"walk" | "fight" | "work", string[][]> = {
  walk: [legPose(0), legPose(-1), legPose(0), legPose(1)],
  fight: [
    BODY,
    ["..duuuud....", ".duuuuuhd...", "duuuuuuud...", ".duuuuuud..."],
    ["...duuuuuud.", "..duuuuuuhd.", ".duuuuuuuud.", "..duuuuuud.."],
    ["....duuuuuuuuh", "...duuuuuuuuud", "..duuuuuuuud.", "...duuuuud..."],
  ],
  work: [
    BODY,
    ["...duuuuuhd.", "..duuuuuuud.", ".duuuuuuuud.", ".duuuuuuuud."],
    ["...duuuud...", "..duuuuud...", ".duuuuuuuud.", ".duuuuuuuud."],
    ["...duuuuud..", "..duuuuuuhd.", ".duuuuuuuud.", "..duuuuuud.."],
  ],
};

export function crewHead(kin: string): string[] {
  return HEADS[kin as CrewKin] ?? HEADS.human;
}

/** One frame: the head plus one body pose. */
export function crewFrame(kin: string, pose: "walk" | "fight" | "work", frame: number): string[] {
  const body = CREW_POSES[pose][frame] ?? CREW_POSES[pose][0] ?? BODY;
  return [...crewHead(kin), ...body];
}
