/**
 * Per the user: the store as a tabbed sheet, on the ship sheet's tab styles. Supplies (resources and hull repair) first,
 * then one tab per stocked section, then Sell. INVENTED layout.
 * Stores and resources, "Stores assortment": "Unlimited hull repairs", "Limited quantities of all resources", "2-4
 * slots of systems, weapons, drone schematics, augmentations, and crewmembers". Resources are one unit per purchase at
 * a fixed price; ×N is what the store has left (sim.ts rollStock).
 */
import { allCrew, droneDef, weaponDef } from "@stl/pack";
import { crewCopy, droneCopy, itemLines, weaponCopy } from "@/game/interface-copy";
import { Kicker } from "@stl/ui";
import { useState, type ReactNode } from "react";
import { hullRepairPerPoint } from "@/game/content";
import { droneKeyOf } from "@/game/gear-look";
import type { IconName } from "@/game/icons";
import {
  buy,
  canDismiss,
  CREW_CAP,
  dismissCrew,
  leaveStore,
  repairHull,
  weaponSlotCap,
} from "@/game/sim";
import { useGame } from "@/game/store";
import type { Game, StockItem } from "@/game/types";
import type { KinId } from "@/game/extras/kin";
import { canFieldDrone, citedSell, citedSellQuote } from "@/game/wiki/cited-stores";
import { CARGO_SLOTS, cargoOf } from "@/game/wiki/make-room";
import { kinLabel, UNIFORMS } from "@/game/crew-look";
import { ArchiveLines } from "./ArchiveCopy";
import { CloseX } from "./CloseX";
import { CrewFace, CrewSprite } from "./CrewSprite";
import { DroneArt, WeaponArt } from "./GearArt";
import { PixelIcon } from "./PixelIcon";

const act = (fn: (g: Game) => void) => useGame.getState().act(fn);

type Tab = "supplies" | "weapon" | "system" | "drone" | "augment" | "crew" | "sell";

const SECTION_TABS: [Tab, string, IconName][] = [
  ["weapon", "Weapons", "weapons"],
  ["system", "Systems", "upgrade"],
  ["drone", "Drones", "drones"],
  ["augment", "Augments", "upgrade"],
  ["crew", "Crew", "medbay"],
];

const RESOURCE: Record<"fuel" | "missiles" | "parts", [IconName, (g: Game) => number]> = {
  fuel: ["fuel", (g) => g.fuel],
  missiles: ["missile", (g) => g.missiles],
  parts: ["parts", (g) => g.player.parts],
};

/** Why a purchase would not go through, shown on the card. Mirrors the checks in buy and citedBuy. */
function blocked(g: Game, item: StockItem): string | null {
  // Per the user: what does not fit goes to cargo, so only a full cargo hold blocks a purchase.
  const cargoFull = cargoOf(g).length >= CARGO_SLOTS;
  if (item.kind === "weapon" && g.player.weapons.length >= weaponSlotCap(g) && cargoFull)
    return "No free weapon slot or cargo slot.";
  if (item.kind === "drone" && !canFieldDrone(g, item.ref) && cargoFull)
    return "No free schematic slot or cargo slot.";
  if (item.kind === "augment" && g.augments.length >= 3) return "Three augments is the cap.";
  return null;
}

function itemArt(item: StockItem): ReactNode {
  if (item.kind === "weapon") return <WeaponArt id={item.ref} height={30} />;
  if (item.kind === "drone") return <DroneArt kind={droneKeyOf(item.ref)} height={30} />;
  if (item.kind === "crew")
    return <CrewSprite kin={item.ref as KinId} uniform={UNIFORMS[0]} size={40} />;
  if (item.kind === "system") return <PixelIcon name={item.ref as IconName} size={28} />;
  return <PixelIcon name="upgrade" size={28} />;
}

function PriceButton({
  cost,
  scrap,
  why,
  label,
  onBuy,
}: {
  cost: number;
  scrap: number;
  why?: string | null;
  label: string;
  onBuy: () => void;
}) {
  const poor = scrap < cost;
  return (
    <button
      type="button"
      className={`store-price${poor ? " is-poor" : ""}`}
      disabled={!!why || poor}
      aria-label={`${label}, ${cost} scrap`}
      onClick={onBuy}
    >
      <PixelIcon name="scrap" size={14} />
      <b>{cost}</b>
    </button>
  );
}

function stockCopy(item: StockItem): string[] {
  if (item.kind === "weapon") return weaponCopy(weaponDef(item.ref) ?? {});
  if (item.kind === "drone") return droneCopy(droneDef(item.ref));
  if (item.kind === "crew") return crewCopy(allCrew().find((row) => row.id === item.ref));
  return [];
}

function ItemCard({
  game,
  item,
  onFullCrew,
}: {
  game: Game;
  item: StockItem;
  onFullCrew: (item: StockItem) => void;
}) {
  const why = blocked(game, item);
  const fullCrew =
    item.kind === "crew" && game.crew.filter((c) => c.side === "player").length >= CREW_CAP;
  return (
    <section className="store-card" data-kind={item.kind}>
      <span className="store-card-art">{itemArt(item)}</span>
      <b className="store-card-name">{item.name}</b>
      {item.kind === "weapon" || item.kind === "augment" ? (
        <span className="store-card-note">{item.detail}</span>
      ) : null}
      <ArchiveLines lines={stockCopy(item)} mark={`stock-${item.ref}`} />
      {why ? <span className="offer-warn">{why}</span> : null}
      {!why &&
      ((item.kind === "weapon" && game.player.weapons.length >= weaponSlotCap(game)) ||
        (item.kind === "drone" && !canFieldDrone(game, item.ref))) ? (
        <span className="store-card-note">{"Goes to cargo."}</span>
      ) : null}
      {fullCrew ? (
        <span className="offer-warn">{"Crew is full: someone leaves first."}</span>
      ) : null}
      <PriceButton
        cost={item.cost}
        scrap={game.scrap}
        why={why}
        label={`Buy ${item.name}`}
        onBuy={() => (fullCrew ? onFullCrew(item) : act((g) => buy(g, item.id)))}
      />
    </section>
  );
}

function Supplies({ game }: { game: Game }) {
  const stock = game.stock ?? [];
  const rate = hullRepairPerPoint(game.sector);
  const missing = game.player.hullMax - game.player.hull;
  const afford = Math.min(missing, Math.floor(game.scrap / rate));
  return (
    <div className="store-supplies">
      <section className="sheet-group">
        <h3 className="sheet-group-head">
          {"Resources "}
          <span className="BEAM_1">{"One per purchase. ×N is what the store has left."}</span>
        </h3>
        <ArchiveLines lines={itemLines()} mark="supplies" />
        <div className="store-cards">
          {(["fuel", "missiles", "parts"] as const).map((kind) => {
            const item = stock.find((s) => s.kind === kind);
            const [icon, have] = RESOURCE[kind];
            const name =
              kind === "fuel" ? "Fuel" : kind === "missiles" ? "Missiles" : "Drone parts";
            return (
              <section
                key={kind}
                className={`store-card${item ? "" : " is-sold-out"}`}
                data-kind={kind}
              >
                <span className="store-card-art">
                  <PixelIcon name={icon} size={28} />
                </span>
                <b className="store-card-name">
                  {name} <em className="store-stock">×{item?.amount ?? 0}</em>
                </b>
                <span className="store-card-note">
                  {"You have "}
                  {have(game)}.
                </span>
                {item ? (
                  <PriceButton
                    cost={item.cost}
                    scrap={game.scrap}
                    label={`Buy 1 ${name.toLowerCase()}`}
                    onBuy={() => act((g) => buy(g, item.id))}
                  />
                ) : (
                  <span className="store-sold">{"SOLD OUT"}</span>
                )}
              </section>
            );
          })}
        </div>
      </section>
      <section className="sheet-group">
        <h3 className="sheet-group-head">
          {"Hull repair "}
          <span className="BEAM_1">
            {rate}
            {" scrap a point."}
          </span>
        </h3>
        <div className="store-repair">
          <span className="store-hull">
            <PixelIcon name="ship" size={20} />
            <b>
              {game.player.hull}/{game.player.hullMax}
            </b>
          </span>
          <button
            type="button"
            disabled={missing <= 0 || game.scrap < rate}
            onClick={() => act((g) => repairHull(g, "one"))}
          >
            {"Repair 1 "}
            <small>{rate}</small>
          </button>
          {/* What the scrap covers, when that is short of a full repair. */}
          {afford > 1 && afford < missing ? (
            <button type="button" onClick={() => act((g) => repairHull(g, "max"))}>
              {"Repair "}
              {afford} <small>{afford * rate}</small>
            </button>
          ) : null}
          <button
            type="button"
            disabled={missing <= 0 || game.scrap < missing * rate}
            onClick={() => act((g) => repairHull(g, "all"))}
          >
            {"Repair all "}
            <small>{missing * rate || ""}</small>
          </button>
        </div>
      </section>
    </div>
  );
}

function SellList({ game }: { game: Game }) {
  const quotes = citedSellQuote(game);
  if (!quotes.length) return <p className="store-note">{"Nothing fitted sells."}</p>;
  return (
    <div className="store-cards">
      {quotes.map((quote) => (
        <section key={quote.id} className="store-card" data-kind={quote.kind}>
          <span className="store-card-art">
            {quote.kind === "weapon" ? (
              <WeaponArt id={quote.ref} height={30} />
            ) : quote.kind === "drone" ? (
              <DroneArt kind={droneKeyOf(quote.ref)} height={30} />
            ) : (
              <PixelIcon name="upgrade" size={28} />
            )}
          </span>
          <b className="store-card-name">{quote.name}</b>
          <button
            type="button"
            className="store-price is-sell"
            aria-label={`Sell ${quote.name} for ${quote.scrap} scrap`}
            onClick={() => act((g) => citedSell(g, quote.id))}
          >
            {"SELL "}
            <PixelIcon name="scrap" size={14} />
            <b>{quote.scrap}</b>
          </button>
        </section>
      ))}
    </div>
  );
}

/**
 * Crew: at full crew a store hire requires relieving "one of the existing crewmembers before purchase/hire". Pick who
 * leaves, then confirm; the hire and the dismissal happen together, so cancelling costs nothing. INVENTED look.
 */
function RelieveFirst({ game, item, onDone }: { game: Game; item: StockItem; onDone: () => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const crew = game.crew.filter((c) => c.side === "player");
  const chosen = crew.find((c) => c.id === pick && canDismiss(game, c.id));
  return (
    <div className="make-room-store" role="dialog" aria-label={"Make room for the new hire"}>
      <p className="event-lead">
        {"Hire "}
        {item.name}
        {": who leaves?"}
      </p>
      <p className="BEAM_1">
        {"A ship holds eight. Someone already aboard must be relieved before the hire."}
      </p>
      <div className="make-room-picks" role="radiogroup" aria-label={"Relieve"}>
        {crew.map((c) => {
          const may = canDismiss(game, c.id);
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={pick === c.id}
              className={`make-room-pick${pick === c.id ? " is-on" : ""}`}
              disabled={!may}
              onClick={() => setPick(c.id)}
            >
              <span className="make-room-art">
                <CrewFace crew={c} size={40} />
              </span>
              <b>{c.name}</b>
              <span className="BEAM_1">
                {may ? kinLabel(c.kin) : c.aboard !== "player" ? "Not aboard." : "Can't leave now."}
              </span>
            </button>
          );
        })}
      </div>
      <div className="store-repair">
        <button type="button" onClick={onDone}>
          {"Cancel"}
        </button>
        <button
          type="button"
          className="make-room-go"
          disabled={!chosen || game.scrap < item.cost}
          onClick={() => {
            if (!chosen) return;
            act((g) => {
              if (g.scrap < item.cost || !dismissCrew(g, chosen.id)) return;
              buy(g, item.id);
            });
            onDone();
          }}
        >
          {chosen ? `Relieve ${chosen.name} and hire` : "Pick who leaves"}
        </button>
      </div>
    </div>
  );
}

export function StoreBoard({ game }: { game: Game }) {
  const [hiring, setHiring] = useState<StockItem | null>(null);
  const stock = game.stock ?? [];
  const tabs: [Tab, string, IconName][] = [
    ["supplies", "Supplies", "fuel"],
    ...SECTION_TABS.filter(([kind]) => stock.some((item) => item.kind === kind)),
    ["sell", "Sell", "scrap"],
  ];
  const [picked, setTab] = useState<Tab>("supplies");
  // A section emptied by buying its last item falls back to Supplies.
  const tab = tabs.some(([id]) => id === picked) ? picked : "supplies";
  const leave = () => act((g) => leaveStore(g));
  return (
    <div className="overlay">
      <article className="sheet ftl-sheet ship-sheet store-sheet has-x" aria-label={"Store"}>
        <CloseX onClose={leave} label={"Leave the store"} />
        <header className="ship-sheet-head">
          <Kicker as="h2">{"Store"}</Kicker>
          <span className="store-have" aria-label={"Your supplies"}>
            <span title={"Hull"}>
              <PixelIcon name="ship" size={16} />
              {game.player.hull}
            </span>
            <span title={"Fuel"}>
              <PixelIcon name="fuel" size={16} />
              {game.fuel}
            </span>
            <span title={"Missiles"}>
              <PixelIcon name="missile" size={16} />
              {game.missiles}
            </span>
            <span title={"Drone parts"}>
              <PixelIcon name="parts" size={16} />
              {game.player.parts}
            </span>
          </span>
          <span className="scrap-box ship-sheet-scrap" aria-label={`${game.scrap} scrap`}>
            <PixelIcon name="scrap" size={18} />
            <b>{game.scrap}</b>
          </span>
        </header>
        <div
          className="ship-tabs"
          role="tablist"
          aria-label={"Store"}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const ids = tabs.map(([id]) => id);
            const focused = ids.indexOf(
              (e.target as HTMLElement).id.replace("store-tab-", "") as Tab,
            );
            const at = focused >= 0 ? focused : ids.indexOf(tab);
            const next = ids[(at + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length]!;
            setTab(next);
            requestAnimationFrame(() => document.getElementById(`store-tab-${next}`)?.focus());
          }}
        >
          {tabs.map(([id, label, icon]) => {
            const on = tab === id;
            const count =
              id === "supplies" || id === "sell"
                ? null
                : stock.filter((item) => item.kind === id).length;
            return (
              <button
                key={id}
                id={`store-tab-${id}`}
                type="button"
                role="tab"
                className={`ship-tab${on ? " is-on" : ""}`}
                aria-selected={on}
                aria-controls="store-tab-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(id)}
              >
                <PixelIcon name={icon} size={18} />
                <span>{label}</span>
                {count != null ? <em className="ship-tab-count">{count}</em> : null}
              </button>
            );
          })}
        </div>
        <div
          className="ship-tab-panel store-panel"
          id="store-tab-panel"
          role="tabpanel"
          aria-labelledby={`store-tab-${tab}`}
        >
          {tab === "supplies" ? <Supplies game={game} /> : null}
          {tab === "sell" ? <SellList game={game} /> : null}
          {hiring && stock.some((item) => item.id === hiring.id) ? (
            <RelieveFirst game={game} item={hiring} onDone={() => setHiring(null)} />
          ) : tab !== "supplies" && tab !== "sell" ? (
            <div className="store-cards">
              {stock
                .filter((item) => item.kind === tab)
                .map((item) => (
                  <ItemCard key={item.id} game={game} item={item} onFullCrew={setHiring} />
                ))}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
