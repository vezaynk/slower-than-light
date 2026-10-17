import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { takeDir } from "./take.ts";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const rrwebUmd = path.join(path.dirname(require.resolve("rrweb")), "..", "umd", "rrweb.min.js");
const recordings = takeDir("combat");

type Info = {
  phase: string;
  paused: boolean;
  userPaused: boolean;
  picking: boolean;
  fuel: number;
  autofire: boolean;
  sensors: number;
  name: string;
  flee: number;
  asteroid: boolean;
  cloakOn: boolean;
  cloakLeft: number;
  hack: string | null;
  slingCool: number;
  away: number;
  doorHurt: boolean;
  weaponsVent: boolean;
  weaponsO2: number;
  cloneOffline: boolean | null;
  cloneCount: number;
  escapeRunning: boolean;
  escapeStalled: boolean;
  beamRooms: number;
  enemyWeaponsIon: number;
  swarmTarget: string | null;
  swarmPower: number;
  enginesPower: number;
  shieldsPower: number;
  batteryOn: boolean;
  hurtHp: number | null;
  hurtRoom: string | null;
  shieldsNow: number;
  enemyShields: number;
};

type Reel = {
  show: (scene: string, sensors?: number) => void;
  play: () => void;
  hold: () => void;
  setSensors: (level: number) => void;
  stallEnemyEngines: () => void;
  restoreEnemyEngines: () => void;
  cutClonePower: () => void;
  setFuel: (fuel: number) => void;
  readyJump: () => void;
  killEnemy: () => void;
  freshHack: () => void;
  setEnemyShields: (layers: number) => void;
  primeHits: () => void;
  cloakEnemy: () => void;
  boardOne: () => void;
  poster: () => void;
  enemyRoom: (systemId: string) => string | null;
  info: () => Info;
};

function reelOf(page: Page): Reel {
  return new Proxy({} as Reel, {
    get(_target, key: string) {
      return (...args: unknown[]) => page.evaluate(([method, params]) => {
        const reel = (window as unknown as { __stlReel: Reel }).__stlReel;
        return (reel[method as keyof Reel] as (...inner: unknown[]) => unknown)(...(params as unknown[]));
      }, [key, args] as const);
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
  if ((await page.locator(".radial-shade").count()) === 0) {
    await longPress(page, hit);
  }
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

/**
 * A send or recall arms a 20s teleporter cooldown, and the open radial freezes the fight.
 * Wait it out with the menu closed. Fast-forward shortens the sit without skipping the clock.
 */
async function waitSlingCool(page: Page, reel: Reel) {
  if ((await page.locator(".radial-shade").count()) > 0) await dismissRadial(page);
  if ((await reel.info()).slingCool <= 0) return;
  await page.keyboard.press("Backquote");
  try {
    await expect.poll(async () => (await reel.info()).slingCool, { timeout: 25_000 }).toBeLessThanOrEqual(0);
  } finally {
    await page.keyboard.press("Backquote");
  }
}

test("records the combat demonstration", async ({ page }) => {
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
    // The UMD crashes the renderer if it runs as an init script, before the document exists.
    // A script tag after load records a full snapshot plus every later mutation.
    await page.addScriptTag({ path: rrwebUmd });
    await page.addScriptTag({ path: path.join(here, "reel-boot.js") });
    await page.waitForFunction(() => ((window as unknown as { __rrwebEvents?: unknown[] }).__rrwebEvents?.length ?? 0) > 0);
    const reel = reelOf(page);

    await reel.show("stacked");
    await expect(page.locator(".play-root")).toBeVisible();
    await beat(page, 2800);
    await reel.hold();
    await expect(page.locator(".pause-mark")).toBeVisible();
    const beside = page.locator(".hud-beside");
    const slot = await beside.boundingBox();
    expect(slot?.width).toBeGreaterThan(160);
    await beat(page, 700);

    await reel.show("quiet");
    await expect(page.getByText("Pirate Light-Surveyor", { exact: true })).toBeVisible();
    await expect(page.getByText("Hostile", { exact: true })).toBeVisible();
    await expect(page.locator("button.gun-slot[data-tray='weapons']")).toHaveCount(4);
    await expect(page.getByRole("tab", { name: /WEAPONS/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /DRONES/ })).toBeVisible();
    await glide(page, page.locator(".hud-beside"));
    await glide(page, page.locator("button.gun-slot[data-tray='weapons']").first());
    await beat(page, 800);

    await reel.show("reading", 1);
    await expect.poll(async () => (await reel.info()).sensors).toBe(1);
    await beat(page, 800);
    await reel.setSensors(2);
    await beat(page, 800);
    await reel.setSensors(3);
    await beat(page, 800);
    await reel.setSensors(4);
    await expect.poll(async () => (await reel.info()).enemyWeaponsIon).toBeGreaterThan(0);
    await beat(page, 800);

    await reel.show("quiet");
    const weaponsRoom = await reel.enemyRoom("weapons");
    const shieldsRoom = await reel.enemyRoom("shields");
    expect(weaponsRoom).toBeTruthy();
    expect(shieldsRoom).toBeTruthy();
    const burst = page.locator("button.gun-slot[data-tray='weapons'][data-slot='0']");
    await glide(page, burst);
    await burst.click();
    await enemyRoomHit(page, weaponsRoom!).click({ force: true });
    const crew = page.locator(`.hull[data-ship="enemy"] [data-room="${weaponsRoom}"] [data-crew]`).first();
    if ((await crew.count()) > 0) await glide(page, crew);
    await enemyRoomHit(page, weaponsRoom!).click({ force: true });
    await page.keyboard.press("3");
    await enemyRoomHit(page, shieldsRoom!).click({ force: true });
    const other = (await reel.enemyRoom("engines")) ?? weaponsRoom!;
    await glide(page, enemyRoomHit(page, other));
    await expect(page.locator(".room.is-beam").first()).toBeVisible();
    const thumb = page.locator(".aim-rail-y .aim-thumb.is-end");
    if ((await thumb.count()) > 0) {
      const box = await thumb.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y - 36, { steps: 12 });
        await page.mouse.up();
      }
    }
    await enemyRoomHit(page, other).click({ force: true });
    await beat(page, 500);

    await reel.primeHits();
    await reel.play();
    await beat(page, 2200);
    await reel.hold();
    await expect(page.locator(".pause-mark")).toBeVisible();
    await beat(page, 600);

    const shieldsBar = page.getByRole("button", { name: "Shields power 2" });
    await glide(page, shieldsBar);
    await shieldsBar.click();
    const engines = page.locator(".power-col").filter({ has: page.getByRole("button", { name: "Engines power 1" }) });
    const column = await engines.boundingBox();
    expect(column).toBeTruthy();
    await page.mouse.move(column!.x + column!.width / 2, column!.y + 6, { steps: 8 });
    await page.mouse.down();
    await page.mouse.move(column!.x + column!.width / 2, column!.y + column!.height + 28, { steps: 18 });
    await page.mouse.up();
    await expect.poll(async () => (await reel.info()).enginesPower).toBeLessThan(4);
    await page.locator('.sys-orb[title="Weapons"]').click({ button: "right" });
    await beat(page, 400);
    await page.keyboard.press("b");
    await expect.poll(async () => (await reel.info()).batteryOn).toBe(true);
    await page.keyboard.down("Shift");
    await page.keyboard.press("a");
    await page.keyboard.up("Shift");
    await beat(page, 700);

    await reel.show("stacked");
    await reel.play();
    await beat(page, 400);
    await page.keyboard.press("Space");
    await expect(page.locator(".pause-mark")).toBeVisible();
    await page.keyboard.down("Space");
    await beat(page, 450);
    await expect(page.locator(".pause-mark")).toHaveCount(0);
    await page.keyboard.up("Space");
    await expect(page.locator(".pause-mark")).toBeVisible();
    await page.keyboard.press("Backquote");
    await beat(page, 700);
    await page.keyboard.press("Backquote");
    await reel.hold();
    await beat(page, 400);

    await reel.show("quiet");
    await reel.play();
    await openRadial(page, "p-weapons");
    await act(page, "AUTOFIRE");
    await expect.poll(async () => (await reel.info()).autofire).toBe(true);
    await expect(page.locator(".radial-shade")).toBeVisible();
    await dismissRadial(page);
    await openRadial(page, "p-doors");
    await act(page, "Open all");
    await act(page, "Open all");
    await act(page, "Close all");
    await act(page, "Close all");
    await dismissRadial(page);
    await playerRoom(page, "p-medbay").click({ button: "right", force: true });
    await expect(page.locator(".radial-shade")).toHaveCount(0);
    await beat(page, 700);
    await reel.hold();

    await reel.show("inside");
    await expect(page.locator(".clone-line")).toBeVisible();
    await expect(page.locator(".clone-line")).not.toHaveClass(/is-offline/);
    await reel.play();
    await openRadial(page, "p-weapons");
    const airlock = page.locator(".radial-door.is-airlock.is-hurt");
    await expect(airlock).toBeVisible();
    await glide(page, airlock);
    await airlock.click();
    await expect(page.locator(".radial-shade")).toBeVisible();
    await dismissRadial(page);
    await beat(page, 1200);
    await expect.poll(async () => (await reel.info()).weaponsVent || (await reel.info()).weaponsO2 < 100).toBe(true);
    await playerRoom(page, "p-medbay").click({ button: "right", force: true });
    await beat(page, 900);
    await reel.hold();
    await reel.cutClonePower();
    await expect(page.locator(".clone-line.is-offline")).toBeVisible();
    await beat(page, 800);

    await reel.show("quiet");
    await reel.play();
    await openRadial(page, "p-cloak");
    await act(page, "Cloak");
    await expect.poll(async () => (await reel.info()).cloakOn).toBe(true);
    await dismissRadial(page);
    await beat(page, 900);
    await openRadial(page, "p-hack");
    await act(page, "Hack");
    await expect(page.locator(".radial-shade")).toHaveCount(0);
    await expect(page.locator(".play.is-hack-targeting, .play-root.is-hack-targeting")).toBeVisible();
    const hackShields = await reel.enemyRoom("shields");
    await enemyRoomHit(page, hackShields!).click({ force: true });
    await expect.poll(async () => (await reel.info()).hack ?? "", { timeout: 12_000 }).toMatch(/pulse|latched|flying/);
    await beat(page, 500);
    await reel.freshHack();
    await openRadial(page, "p-hack");
    await act(page, "Hack");
    const hackPilot = await reel.enemyRoom("pilot");
    await enemyRoomHit(page, hackPilot!).click({ force: true });
    await expect.poll(async () => (await reel.info()).hack ?? "", { timeout: 12_000 }).toMatch(/pulse|latched|flying/);
    await beat(page, 600);

    await openRadial(page, "p-mind");
    await act(page, "Mind control");
    await expect(page.locator(".play.is-leash-targeting, .play-root.is-leash-targeting")).toBeVisible();
    const foeCrew = page.locator('.hull[data-ship="enemy"] [data-crew]').first();
    await glide(page, foeCrew);
    await foeCrew.click({ force: true });
    await beat(page, 600);
    await openRadial(page, "p-mind");
    const mindColumn = page.locator(".radial-power .power-col");
    const mindBox = await mindColumn.boundingBox();
    if (mindBox) {
      await page.mouse.move(mindBox.x + mindBox.width / 2, mindBox.y + 4, { steps: 6 });
      await page.mouse.down();
      await page.mouse.move(mindBox.x + mindBox.width / 2, mindBox.y + mindBox.height + 24, { steps: 12 });
      await page.mouse.up();
    }
    await dismissRadial(page);

    await openRadial(page, "p-tele");
    await page.locator(".radial-mate").nth(0).click();
    await page.locator(".radial-mate").nth(1).click();
    await act(page, "Send");
    await expect(page.locator(".radial-shade")).toHaveCount(0);
    const teleRoom = (await reel.enemyRoom("weapons")) ?? hackShields!;
    await enemyRoomHit(page, teleRoom).click({ force: true });
    await beat(page, 500);
    await expect.poll(async () => (await reel.info()).away).toBeGreaterThan(0);
    await waitSlingCool(page, reel);
    await openRadial(page, "p-tele");
    await act(page, "Recall");
    await beat(page, 400);
    await expect.poll(async () => (await reel.info()).away).toBe(0);
    await dismissRadial(page).catch(() => undefined);

    await reel.setSensors(2);
    await reel.cloakEnemy();
    await expect(page.locator(".cloak-tag")).toBeVisible();
    await beat(page, 600);
    await waitSlingCool(page, reel);
    await openRadial(page, "p-tele");
    await page.locator(".radial-mate").first().click();
    await act(page, "Send");
    const cloakedRoom = (await reel.enemyRoom("oxygen")) ?? teleRoom;
    if ((await page.locator(".radial-shade").count()) === 0) {
      await enemyRoomHit(page, cloakedRoom).click({ force: true });
    } else {
      await dismissRadial(page);
    }
    await beat(page, 400);
    if ((await reel.info()).away < 1) await reel.boardOne();
    await expect.poll(async () => (await reel.info()).away).toBeGreaterThan(0);
    await expect(page.locator('.hull[data-ship="enemy"] .room:not(.is-unseen)').first()).toBeVisible();
    await beat(page, 700);

    await page.getByRole("tab", { name: /DRONES/ }).click();
    await expect(page.locator("button.gun-slot[data-tray='drones']")).toHaveCount(2);
    await page.locator("button.gun-slot[data-tray='drones'][data-slot='0']").click();
    await beat(page, 500);
    await page.locator("button.gun-slot[data-tray='drones'][data-slot='1']").click();
    await beat(page, 600);
    await page.keyboard.down("Shift");
    await page.keyboard.press("e");
    await page.keyboard.up("Shift");
    await page.keyboard.down("Shift");
    await page.keyboard.press("e");
    await page.keyboard.up("Shift");
    await beat(page, 500);
    await reel.hold();
    await expect(page.locator(".pause-mark")).toBeVisible();
    await beat(page, 400);
    await reel.play();
    await page.keyboard.press("e");
    await page.keyboard.press("e");
    await beat(page, 500);
    await page.getByRole("tab", { name: /WEAPONS/ }).click();
    await expect(page.locator("button.gun-slot[data-tray='weapons']").first()).toBeVisible();

    await reel.show("stacked");
    await beat(page, 1200);
    await expect(page.locator(".escape-line")).toBeVisible();
    await reel.stallEnemyEngines();
    await expect(page.locator(".escape-line.is-stalled")).toBeVisible();
    await beat(page, 700);
    await reel.restoreEnemyEngines();
    await reel.setFuel(1);
    await reel.readyJump();
    await page.keyboard.press("j");
    await expect(page.locator(".map-beacon.is-linked").first()).toBeVisible();
    await page.locator(".map-beacon.is-linked").first().click();
    await expect(page.locator(".map-confirm")).toBeVisible();
    await page.locator(".map-confirm").getByRole("button", { name: "Stay", exact: true }).click();
    await expect(page.locator(".map-confirm")).toHaveCount(0);
    await expect.poll(async () => (await reel.info()).phase).toBe("combat");
    await page.keyboard.press("j");
    await expect.poll(async () => (await reel.info()).picking).toBe(false);

    await reel.show("stacked");
    await reel.play();
    await beat(page, 2500);
    await page.keyboard.press("Backquote");
    await beat(page, 1200);
    await page.keyboard.press("Backquote");
    await reel.poster();
    await expect(page.locator(".pause-mark")).toBeVisible();
    await expect.poll(async () => (await reel.info()).hack).toBe("pulse");
    await expect.poll(async () => (await reel.info()).doorHurt).toBe(true);
    await beat(page, 1200);
    await reel.killEnemy();
    await page.waitForFunction(() => document.querySelector("button.choice-line"), null, { timeout: 20_000 });
    const choice = page.locator("button.choice-line");
    if (await choice.isDisabled()) {
      await choice.click({ force: true });
      await expect.poll(async () => (await reel.info()).phase).toBe("reward");
      await expect(choice).toBeEnabled();
    }
    await choice.click();
    await expect.poll(async () => (await reel.info()).phase).not.toBe("reward");
    await beat(page, 600);
  } catch (error) {
    failed = error;
    const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
    fs.writeFileSync(path.join(recordings, "error.txt"), message);
  } finally {
    const events = await page.evaluate(() => (window as unknown as { __rrwebEvents?: { type: number }[] }).__rrwebEvents ?? []).catch(() => []);
    fs.writeFileSync(path.join(recordings, "replay.json"), JSON.stringify(events));
    await page.close();
    const video = page.video();
    if (video) await video.saveAs(path.join(recordings, "video.webm"));
  }

  const saved = JSON.parse(fs.readFileSync(path.join(recordings, "replay.json"), "utf8")) as { type: number }[];
  expect(saved.length).toBeGreaterThan(2);
  expect(saved.some((event) => event.type === 2)).toBe(true);
  expect(saved.some((event) => event.type === 4)).toBe(true);
  const videoStat = fs.statSync(path.join(recordings, "video.webm"));
  expect(videoStat.size).toBeGreaterThan(10_000);
  if (failed) throw failed;
});
