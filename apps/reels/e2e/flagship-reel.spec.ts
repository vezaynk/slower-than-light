import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { takeDir } from "./take.ts";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const rrwebUmd = path.join(path.dirname(require.resolve("rrweb")), "..", "umd", "rrweb.min.js");
const recordings = takeDir("flagship");

type Info = {
  phase: string;
  autofire: boolean;
  cloakOn: boolean;
  hack: string | null;
  slingCool: number;
  away: number;
  batteryOn: boolean;
  shieldsPower: number;
  playerHull: number;
  playerMax: number;
  enemyHull: number;
  enemyMax: number;
  stage: number;
  name: string;
  fires: number;
  cloakCool: number;
  surge: number;
  shieldsNow: number;
};

type Reel = {
  show: (scene: string, sensors?: number) => void;
  play: () => void;
  hold: () => void;
  springEnemyCloak: () => void;
  armVolley: () => void;
  pointGuns: () => void;
  ensureFire: () => void;
  readyCloak: () => void;
  enemyRoom: (systemId: string) => string | null;
  info: () => Info;
};

function reelOf(page: Page): Reel {
  return new Proxy({} as Reel, {
    get(_target, key: string) {
      return (...args: unknown[]) =>
        page.evaluate(
          ([method, params]) => {
            const reel = (window as unknown as { __stlReel: Reel }).__stlReel;
            return (reel[method as keyof Reel] as (...inner: unknown[]) => unknown)(
              ...(params as unknown[]),
            );
          },
          [key, args] as const,
        );
    },
  });
}

async function beat(page: Page, ms = 900) {
  await page.waitForTimeout(ms);
}

async function glide(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing target");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 16 });
  return { x, y, box };
}

async function longPress(page: Page, locator: Locator) {
  const { x, y } = await glide(page, locator);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
}

function playerRoom(page: Page, id: string) {
  return page.locator(`.hull[data-ship="player"] [data-room="${id}"] .room-hit`);
}

function enemyRoomHit(page: Page, id: string) {
  return page.locator(`.hull[data-ship="enemy"] [data-room="${id}"] .room-hit`);
}

async function openRadial(page: Page, roomId: string) {
  const hit = playerRoom(page, roomId);
  await longPress(page, hit);
  if ((await page.locator(".radial-shade").count()) === 0) await longPress(page, hit);
  await expect(page.locator(".radial-shade")).toBeVisible();
}

async function dismissRadial(page: Page) {
  const shade = page.locator(".radial-shade");
  await shade.click({ position: { x: 8, y: 8 } });
  await expect(shade).toHaveCount(0);
}

async function act(page: Page, name: string) {
  const button = page.locator(".radial-acts").getByRole("button", { name, exact: true });
  await glide(page, button);
  await button.click({ timeout: 15_000 });
}

async function waitSlingCool(page: Page, reel: Reel) {
  if ((await page.locator(".radial-shade").count()) > 0) await dismissRadial(page);
  if ((await reel.info()).slingCool <= 0) return;
  await page.keyboard.press("Backquote");
  try {
    await expect
      .poll(async () => (await reel.info()).slingCool, { timeout: 25_000 })
      .toBeLessThanOrEqual(0);
  } finally {
    await page.keyboard.press("Backquote");
  }
}

/** Unpause, but freeze the fight if either hull is about to give out. */
async function trade(page: Page, reel: Reel, ms: number) {
  await reel.play();
  const start = Date.now();
  while (Date.now() - start < ms) {
    const info = await reel.info();
    if (info.phase !== "combat" || info.playerHull <= 8 || info.enemyHull <= 6) break;
    await page.waitForTimeout(200);
  }
  await reel.hold();
}

/** Open the airlocks, let the vacuum put the fires out, then shut the locks again. */
async function ventFires(page: Page, reel: Reel) {
  await reel.hold();
  if ((await page.locator(".radial-shade").count()) > 0) await dismissRadial(page);
  await reel.ensureFire();
  await beat(page, 500);
  expect((await reel.info()).fires).toBeGreaterThan(0);
  await openRadial(page, "p-doors");
  await act(page, "Open all");
  await beat(page, 350);
  await act(page, "Open all");
  await beat(page, 400);
  await dismissRadial(page);
  await reel.play();
  await expect
    .poll(
      async () => {
        const info = await reel.info();
        if (info.phase !== "combat") return -1;
        return info.fires;
      },
      { timeout: 25_000 },
    )
    .toBe(0);
  await reel.hold();
  await beat(page, 700);
  await openRadial(page, "p-doors");
  await act(page, "Close all");
  await beat(page, 300);
  await act(page, "Close all");
  await dismissRadial(page);
  expect((await reel.info()).fires).toBe(0);
  await beat(page, 500);
}

/** A fallen stage ends the battle. The card opens the next hull while the Flagship holds the base. */
async function nextHull(page: Page, reel: Reel) {
  await reel.hold();
  const cont = page.getByRole("button", { name: "1. Continue..." });
  await expect(cont).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByText("The Flagship holds the base.")).toBeVisible();
  await beat(page, 900);
  await cont.click();
  await expect.poll(async () => (await reel.info()).phase, { timeout: 15_000 }).toBe("combat");
  await reel.pointGuns();
  await reel.readyCloak();
}

/** Keep firing until the flagship's last stage breaks up. */
async function fightToTheEnd(page: Page, reel: Reel) {
  await reel.hold();
  await reel.readyCloak();
  const ion = page.locator("button.gun-slot[data-tray='weapons'][data-slot='1']");
  await glide(page, ion);
  await ion.click();
  const shields = await reel.enemyRoom("shields");
  expect(shields).toBeTruthy();
  await enemyRoomHit(page, shields!).click({ force: true });
  await beat(page, 300);
  await reel.pointGuns();

  await page.getByRole("tab", { name: /DRONES/ }).click();
  await page.locator("button.gun-slot[data-tray='drones'][data-slot='0']").click();
  await beat(page, 400);
  await page.getByRole("tab", { name: /WEAPONS/ }).click();

  for (let i = 0; i < 2; i += 1) {
    if ((await reel.info()).shieldsPower >= 8) break;
    await page.locator('.sys-orb[title="Shields"]').click();
  }

  await page.keyboard.press("Backquote");
  await reel.play();

  let stage = (await reel.info()).stage;
  const seen = new Set<number>([stage]);
  let cloakTried = 0;
  let hackTried = 0;
  const start = Date.now();
  while (Date.now() - start < 210_000) {
    await reel.readyCloak();
    const info = await reel.info();
    if (info.phase === "victory") break;
    if (info.phase === "reward") {
      await nextHull(page, reel);
      stage = (await reel.info()).stage;
      seen.add(stage);
      await reel.play();
      continue;
    }
    if (info.phase !== "combat") {
      throw new Error(
        `fight ended in ${info.phase} at player hull ${info.playerHull}, stage ${info.stage}`,
      );
    }
    const surgeSoon = info.stage >= 2 && info.surge >= 0 && info.surge < 7;
    const cloakNow = !info.cloakOn && info.cloakCool <= 0 && (info.shieldsNow <= 1 || surgeSoon);
    if (cloakNow && Date.now() - cloakTried > 2500) {
      cloakTried = Date.now();
      await reel.readyCloak();
      await page.keyboard.press("c");
      const cloak = page.locator("button.kit-act").filter({ hasText: "CLOAK" });
      if ((await cloak.count()) > 0) {
        const box = await cloak
          .first()
          .boundingBox({ timeout: 1000 })
          .catch(() => null);
        if (box)
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      }
    }
    if (info.hack === "latched" && Date.now() - hackTried > 2500) {
      hackTried = Date.now();
      const hack = page.locator(".hack-orb");
      if ((await hack.count()) > 0) {
        const box = await hack.boundingBox({ timeout: 1000 }).catch(() => null);
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
          await hack.click({ timeout: 1500 });
        } else {
          await page.keyboard.press("n");
        }
      } else {
        await page.keyboard.press("n");
      }
    }
    await page.waitForTimeout(200);
  }

  const end = await reel.info();
  expect(end.phase).toBe("victory");
  expect(seen.has(2)).toBe(true);
  expect(seen.has(3)).toBe(true);
  await expect(page.locator(".victory-cinema")).toBeVisible({ timeout: 15_000 });
  await beat(page, 1600);
  await page.locator(".victory-cinema").click();
  await expect(page.locator(".verdict")).toBeVisible();
  await beat(page, 1400);
}

test("records the flagship fight", async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  fs.mkdirSync(recordings, { recursive: true });
  fs.rmSync(path.join(recordings, "error.txt"), { force: true });

  let failed: unknown;
  try {
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(60_000);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => {
      const w = window as unknown as { __stl?: unknown; __stlReel?: unknown };
      return Boolean(w.__stl && w.__stlReel);
    });
    await page.addScriptTag({ path: rrwebUmd });
    await page.addScriptTag({ path: path.join(here, "reel-boot.js") });
    await page.waitForFunction(
      () => ((window as unknown as { __rrwebEvents?: unknown[] }).__rrwebEvents?.length ?? 0) > 0,
    );
    const reel = reelOf(page);

    await reel.show("flagship");
    await expect(page.locator(".play-root")).toBeVisible();
    await expect(page.getByText("Rebel Flagship", { exact: true })).toBeVisible();
    await expect(page.getByText("Hostile", { exact: true })).toBeVisible();
    await expect(page.locator("button.gun-slot[data-tray='weapons']")).toHaveCount(4);
    await glide(page, page.locator(".hud-beside"));
    await glide(page, page.locator(".hull[data-ship='enemy']"));
    await beat(page, 900);

    await trade(page, reel, 2200);
    await expect(page.locator(".pause-mark")).toBeVisible();
    const wounded = await reel.info();
    expect(wounded.playerHull).toBeGreaterThan(0);
    expect(wounded.playerHull).toBeLessThan(wounded.playerMax);
    expect(wounded.enemyHull).toBeGreaterThan(0);
    expect(wounded.enemyHull).toBeLessThan(wounded.enemyMax);
    await beat(page, 500);

    await page.locator('.sys-orb[title="Shields"]').click();
    await expect.poll(async () => (await reel.info()).shieldsPower).toBeGreaterThanOrEqual(6);
    await openRadial(page, "p-battery");
    await act(page, "Boost");
    await expect.poll(async () => (await reel.info()).batteryOn).toBe(true);
    await dismissRadial(page);

    await openRadial(page, "p-weapons");
    await act(page, "AUTOFIRE");
    await expect.poll(async () => (await reel.info()).autofire).toBe(true);
    await dismissRadial(page);

    await ventFires(page, reel);

    const burst = page.locator("button.gun-slot[data-tray='weapons'][data-slot='0']");
    await glide(page, burst);
    await burst.click();
    const shields = await reel.enemyRoom("shields");
    expect(shields).toBeTruthy();
    await enemyRoomHit(page, shields!).click({ force: true });
    await beat(page, 400);

    await reel.play();
    await openRadial(page, "p-hack");
    await act(page, "Hack");
    await expect(page.locator(".radial-shade")).toHaveCount(0);
    await expect(
      page.locator(".play.is-hack-targeting, .play-root.is-hack-targeting"),
    ).toBeVisible();
    await enemyRoomHit(page, shields!).click({ force: true });
    await expect
      .poll(async () => (await reel.info()).hack ?? "", { timeout: 12_000 })
      .toMatch(/pulse|latched|flying/);
    await beat(page, 700);
    await reel.hold();

    await openRadial(page, "p-mind");
    await act(page, "Mind control");
    await expect(
      page.locator(".play.is-leash-targeting, .play-root.is-leash-targeting"),
    ).toBeVisible();
    const foeCrew = page.locator('.hull[data-ship="enemy"] [data-crew]').first();
    await glide(page, foeCrew);
    await foeCrew.click({ force: true });
    await beat(page, 700);
    await openRadial(page, "p-mind");
    const mindColumn = page.locator(".radial-power .power-col");
    const mindBox = await mindColumn.boundingBox();
    if (mindBox) {
      await page.mouse.move(mindBox.x + mindBox.width / 2, mindBox.y + 4, { steps: 6 });
      await page.mouse.down();
      await page.mouse.move(mindBox.x + mindBox.width / 2, mindBox.y + mindBox.height + 24, {
        steps: 12,
      });
      await page.mouse.up();
    }
    await dismissRadial(page);

    await openRadial(page, "p-tele");
    await page.locator(".radial-mate").nth(0).click();
    await page.locator(".radial-mate").nth(1).click();
    await act(page, "Send");
    await expect(page.locator(".radial-shade")).toHaveCount(0);
    await enemyRoomHit(page, "e-missile").click({ force: true });
    await beat(page, 400);
    await expect.poll(async () => (await reel.info()).away).toBeGreaterThan(0);
    await reel.play();
    await waitSlingCool(page, reel);
    await reel.hold();
    await openRadial(page, "p-tele");
    await act(page, "Recall");
    await beat(page, 400);
    await expect.poll(async () => (await reel.info()).away).toBe(0);
    await dismissRadial(page).catch(() => undefined);

    await openRadial(page, "p-cloak");
    await act(page, "Cloak");
    await expect.poll(async () => (await reel.info()).cloakOn).toBe(true);
    await dismissRadial(page);
    await reel.armVolley();
    await trade(page, reel, 1600);

    await reel.springEnemyCloak();
    await trade(page, reel, 1200);
    await expect(page.locator(".cloak-tag")).toBeVisible();

    await page.getByRole("tab", { name: /DRONES/ }).click();
    await expect(page.locator("button.gun-slot[data-tray='drones']")).toHaveCount(2);
    await page.locator("button.gun-slot[data-tray='drones'][data-slot='0']").click();
    await beat(page, 500);
    await page.locator("button.gun-slot[data-tray='drones'][data-slot='1']").click();
    await beat(page, 600);
    await page.getByRole("tab", { name: /WEAPONS/ }).click();

    await fightToTheEnd(page, reel);
  } catch (error) {
    failed = error;
    const message =
      error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
    fs.writeFileSync(path.join(recordings, "error.txt"), message);
  } finally {
    const events = await page
      .evaluate(
        () => (window as unknown as { __rrwebEvents?: { type: number }[] }).__rrwebEvents ?? [],
      )
      .catch(() => []);
    fs.writeFileSync(path.join(recordings, "replay.json"), JSON.stringify(events));
    await page.close();
    const video = page.video();
    if (video) await video.saveAs(path.join(recordings, "video.webm"));
  }

  const saved = JSON.parse(fs.readFileSync(path.join(recordings, "replay.json"), "utf8")) as {
    type: number;
  }[];
  expect(saved.length).toBeGreaterThan(2);
  expect(saved.some((event) => event.type === 2)).toBe(true);
  expect(saved.some((event) => event.type === 4)).toBe(true);
  const videoStat = fs.statSync(path.join(recordings, "video.webm"));
  expect(videoStat.size).toBeGreaterThan(10_000);
  if (failed) throw failed;
});
