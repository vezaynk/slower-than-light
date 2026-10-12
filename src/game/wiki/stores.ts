import { tx } from "../../i18n/index.ts";
/**
 * wiki page "Stores and resources".
 * Numeric store and resource rules from that page.
 * A null value means the figure is described and not numbered.
 * The page does not describe a sell-back ratio.
 */
export const STORE_RULES: { id: string; source: string; text: string; value: number | null }[] = [
  // wiki page "Stores and resources", heading "Guaranteed stores".
  // The count is determined by sector type and is not numbered.
  {
    id: "guaranteed-store-count",
    source: tx("wiki.stores.guaranteed-stores"),
    text: tx("wiki.stores.the-number-of-guaranteed-stores-is"),
    value: null,
  },
  // wiki page "Stores and resources", heading "Additional stores".
  // The count sits in an unexpanded template and is not numbered.
  {
    id: "additional-store-count",
    source: tx("wiki.stores.additional-stores"),
    text: tx("wiki.stores.additional-stores-come-from-events-and"),
    value: null,
  },

  // wiki page "Stores and resources", heading "Store bugs".
  {
    id: "ae-off-weapons",
    source: tx("wiki.stores.store-bugs"),
    text: tx("wiki.stores.with-advanced-edition-content-off-a"),
    value: 2,
  },
  {
    id: "ae-off-crew",
    source: tx("wiki.stores.store-bugs"),
    text: tx("wiki.stores.with-advanced-edition-content-off-a-2"),
    value: 1,
  },
  {
    id: "ae-off-regular-count",
    source: tx("wiki.stores.store-bugs"),
    text: tx("wiki.stores.a-regular-store-offering-is-3"),
    value: 3,
  },
  {
    id: "main-systems",
    source: tx("wiki.stores.store-bugs"),
    text: tx("wiki.stores.with-all-8-main-systems-installed"),
    value: 8,
  },

  // wiki page "Stores and resources", heading "Stores assortment".
  // Missile price is fixed, but the page does not number it.
  {
    id: "missile-price",
    source: tx("wiki.stores.stores-assortment"),
    text: tx("wiki.stores.missile-stock-varies-but-the-missile"),
    value: null,
  },
  // Drone part price is fixed, but the page does not number it.
  {
    id: "drone-part-price",
    source: tx("wiki.stores.stores-assortment"),
    text: tx("wiki.stores.drone-part-stock-varies-but-the"),
    value: null,
  },
  // Repair price per hull point varies by sector and is not numbered.
  {
    id: "repair-per-hull",
    source: tx("wiki.stores.stores-assortment"),
    text: tx("wiki.stores.the-cost-of-repairing-1-hull"),
    value: null,
  },
  // Stock size is limited and varies, and it is not numbered.
  {
    id: "resource-stock",
    source: tx("wiki.stores.stores-assortment"),
    text: tx("wiki.stores.stores-sell-limited-quantities-of-fuel"),
    value: null,
  },
  {
    id: "assortment-slots-min",
    source: tx("wiki.stores.stores-assortment"),
    text: tx("wiki.stores.stores-sell-2-4-slots-of"),
    value: 2,
  },
  {
    id: "assortment-slots-max",
    source: tx("wiki.stores.stores-assortment"),
    text: tx("wiki.stores.stores-sell-2-4-slots-of"),
    value: 4,
  },
  {
    id: "items-per-slot",
    source: tx("wiki.stores.stores-assortment"),
    text: tx("wiki.stores.each-slot-contains-3-random-items"),
    value: 3,
  },

  // wiki page "Stores and resources", heading "Systems".
  {
    id: "systems-offered",
    source: tx("wiki.stores.systems"),
    text: tx("wiki.stores.stores-may-sell-3-random-systems"),
    value: 3,
  },
  {
    id: "teleporter-slots",
    source: tx("wiki.stores.systems"),
    text: tx("wiki.stores.a-bought-teleporter-always-has-2"),
    value: 2,
  },
  {
    id: "teleporter-not-four",
    source: tx("wiki.stores.systems"),
    text: tx("wiki.stores.a-bought-teleporter-always-has-2"),
    value: 4,
  },
  {
    id: "systems-force-count",
    source: tx("wiki.stores.systems"),
    text: tx("wiki.stores.if-a-ship-has-less-than"),
    value: 11,
  },
  {
    id: "systems-force-chance",
    source: tx("wiki.stores.systems"),
    text: tx("wiki.stores.if-a-ship-has-less-than"),
    value: 50,
  },

  // wiki page "Stores and resources", heading "Items and crew rarity".
  {
    id: "rarity-common",
    source: tx("wiki.stores.items-and-crew-rarity"),
    text: tx("wiki.stores.rarity-normally-goes-from-1-to"),
    value: 1,
  },
  {
    id: "rarity-rare",
    source: tx("wiki.stores.items-and-crew-rarity"),
    text: tx("wiki.stores.rarity-normally-goes-from-1-to-2"),
    value: 5,
  },
  {
    id: "rarity-unlisted",
    source: tx("wiki.stores.items-and-crew-rarity"),
    text: tx("wiki.stores.if-rarity-is-set-to-0"),
    value: 0,
  },

  // wiki page "Stores and resources", heading "Crewmembers".
  {
    id: "crew-offered",
    source: tx("wiki.stores.crewmembers"),
    text: tx("wiki.stores.stores-may-sell-3-random-crew"),
    value: 3,
  },

  // wiki page "Stores and resources", heading "Fuel".
  {
    id: "fuel-store-price",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.fuel-costs-3-scrap-from-stores"),
    value: 3,
  },
  {
    id: "fuel-event-price",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.fuel-costs-2-scrap-from-refuelling"),
    value: 2,
  },
  {
    id: "fuel-per-jump",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.each-jump-between-beacons-costs-1"),
    value: 1,
  },
  {
    id: "starting-fuel",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.all-ships-start-with-16-fuel"),
    value: 16,
  },
  {
    id: "no-fuel-jump",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.out-of-fuel-enemy-ships-usually"),
    value: 90,
  },
  // The page guesses this threshold and does not give a precise hull value.
  {
    id: "no-fuel-hull-likely",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.out-of-fuel-the-anti-stalemate"),
    value: 50,
  },
  {
    id: "no-fuel-hull-low",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.out-of-fuel-that-hull-threshold"),
    value: 30,
  },
  {
    id: "no-fuel-hull-high",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.out-of-fuel-that-hull-threshold"),
    value: 40,
  },
  {
    id: "no-fuel-grant",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.out-of-fuel-the-anti-stalemate-2"),
    value: 2,
  },
  {
    id: "no-fuel-quiet",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.out-of-fuel-the-anti-stalemate-3"),
    value: 1,
  },
  {
    id: "no-fuel-boarder",
    source: tx("wiki.stores.fuel"),
    text: tx("wiki.stores.out-of-fuel-the-anti-stalemate-4"),
    value: 60,
  },

  // wiki page "Stores and resources", heading "Missiles".
  {
    id: "missile-per-shot",
    source: tx("wiki.stores.missiles"),
    text: tx("wiki.stores.firing-a-missile-or-a-bomb"),
    value: 1,
  },
  {
    id: "explosive-replicator",
    source: tx("wiki.stores.missiles"),
    text: tx("wiki.stores.the-explosive-replicator-gives-a-50"),
    value: 50,
  },

  // wiki page "Stores and resources", heading "Drone parts".
  {
    id: "drone-part-per-deploy",
    source: tx("wiki.stores.drone-parts"),
    text: tx("wiki.stores.each-drone-deployment-costs-1-drone"),
    value: 1,
  },
];
