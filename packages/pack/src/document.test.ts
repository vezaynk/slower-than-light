import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { emitPack } from "./emit.ts";
import { parsePack } from "./parse.ts";
import {
  crewDef,
  emptyBeacon,
  eventDef,
  fillerList,
  loadPack,
  resetPackForTests,
  tuneDef,
  weaponDef,
} from "./registry.ts";
import type { ContentPack, HullDef, WeaponBlueprint } from "./types.ts";

const laser: WeaponBlueprint = {
  id: "ember",
  name: "Ember Laser",
  kind: "laser",
  power: 1,
  charge: 7,
  shots: 2,
  gap: 0.25,
  damage: 3,
  ion: 0,
  fire: 0.3,
  breach: 0.1,
  ammo: false,
  price: 20,
  blurb: "A short bolt.",
};

const pack: ContentPack = {
  crew: [
    {
      id: "human",
      name: "Human",
      hp: 100,
      move: 1,
      repair: 1,
      fight: 1,
      suffocate: 1,
      fireTaken: 1,
      bonusPower: 0,
      hasDeathExplosion: false,
      drainsOxygen: false,
      detectsLifeforms: false,
      resistsMindControl: false,
      lockdown: false,
      lockCooldown: 0,
      fireRepairMultiplier: 1,
    },
    {
      id: "ember",
      name: "Ember",
      hp: 40,
      move: 1.1,
      repair: 0.5,
      fight: 1.4,
      suffocate: 0.25,
      fireTaken: 0,
      bonusPower: 1,
      hasDeathExplosion: true,
      drainsOxygen: true,
      detectsLifeforms: true,
      resistsMindControl: true,
      lockdown: true,
      lockCooldown: 12,
      fireRepairMultiplier: 1.5,
    },
  ],
  weapons: [laser],
  systems: [{ id: "shields", name: "Shields", cost: 125, slot: "sys" }],
  tunes: [
    { id: "shields", start: 2, costs: [{ level: 1, cost: 100 }] },
    { id: "engines", start: 1, costs: [{ level: 1, cost: 10 }] },
  ],
  stores: [
    {
      id: "standard",
      name: "Store",
      slot: 1,
      weapons: 2,
      sections: ["weapons", "crew", "relics"],
      lines: [
        { id: "fuel", kind: "fuel", name: "Fuel", cost: 3, min: 3, max: 7 },
        { id: "repair", kind: "repair", name: "Hull patch +5", cost: 0, min: 5, max: 5 },
        { id: "human", kind: "crew", name: "Human", cost: 45, min: 1, max: 1 },
        { id: "relic", kind: "", name: "Relic", cost: 9, min: 1, max: 1 },
      ],
    },
  ],
  rewards: {
    scaling: [{ baseAmount: 15, sectorAmount: 6, difficultyAmount: 0 }],
    resources: [{ kind: "fuel", level: "LOW", min: 1, max: 3 }],
    rewards: [
      {
        name: "standard",
        resources: [
          { name: "scrap" },
          { name: "fuel", level: "LOW" },
        ],
        minResources: 2,
        maxResources: 2,
        bonus: { roll: 100, chance: 3 },
      },
    ],
  },
  factions: [{ id: "rebel", chance: 50, min: 20, max: 30 }],
  events: [
    {
      id: "ember",
      dest: "Ember",
      flag: "cited:ember",
      aliases: ["Ember Page"],
      sectors: ["Civilian Sector"],
      body: "A packed beacon.",
      choices: [
        {
          id: "c:ember:0",
          label: "Take",
          fx: [
            { k: "res", id: "scrap", sign: 1, lo: 7, hi: 7 },
            { k: "fight", tier: "pirate", asteroid: true },
            { k: "note", text: "Rock & <Stone>" },
            { k: "quest", id: "ember-quest" },
            { k: "goto", id: "ember-next" },
            { k: "close" },
            { k: "nothing" },
          ],
        },
      ],
      surrender: {
        chance: 100,
        low: 0,
        high: 40,
        reward: { k: "weapon", name: "Anti-Bio Beam" },
        hail: "Yield.",
        hails: ["Yield.", "Please."],
        accept: "Spare them",
        refuse: "Finish them",
        continues: true,
        forced: true,
        quest: "ember-quest",
        result: "They leave.",
        extra: { id: "s:ember:info", label: "Ask" },
        card: { body: "Next.", choices: [{ id: "s:ember:go", label: "Go" }] },
      },
    },
  ],
  lists: [
    {
      id: "ember-list",
      entries: [
        { id: "large-asteroid-field", unique: true },
        { id: "refugee", unique: false },
      ],
    },
  ],
  empties: [
    {
      id: "ember-quiet",
      dest: "Ember quiet",
      sectors: ["Ember Reach"],
      texts: ["Still.", "Rock & <Stone>"],
      nebula: true,
    },
  ],
};

afterEach(() => resetPackForTests());

describe("pack document", () => {
  it("round-trips a fixture through XML", () => {
    const back = parsePack(emitPack(pack));
    assert.deepEqual(back.crew, pack.crew);
    assert.deepEqual(back.weapons, pack.weapons);
    assert.deepEqual(back.systems, pack.systems);
    assert.deepEqual(back.tunes, pack.tunes);
    assert.deepEqual(back.stores, pack.stores);
    assert.deepEqual(back.rewards, pack.rewards);
    assert.deepEqual(back.factions, pack.factions);
    assert.deepEqual(back.events, pack.events);
    assert.deepEqual(back.lists, pack.lists);
    assert.deepEqual(back.empties, pack.empties);
  });

  it("keeps a page body apart from its opening sentences", () => {
    const events = [
      {
        id: "one",
        dest: "One",
        flag: "cited:one",
        aliases: [],
        sectors: [],
        body: "Only",
        choices: [],
      },
      {
        id: "blank",
        dest: "Blank",
        flag: "cited:blank",
        aliases: [],
        sectors: [],
        body: "",
        texts: ["Alpha", "Beta"],
        choices: [],
      },
      {
        id: "same",
        dest: "Same",
        flag: "cited:same",
        aliases: [],
        sectors: [],
        body: "Alpha",
        texts: ["Alpha", "Beta"],
        choices: [],
      },
      {
        id: "aside",
        dest: "Aside",
        flag: "cited:aside",
        aliases: [],
        sectors: [],
        body: "Static",
        texts: ["Alpha", "Beta"],
        choices: [],
      },
    ];
    const xml = emitPack({ events });
    assert.deepEqual(parsePack(xml).events, events);
    const same = xml.slice(xml.indexOf('name="same"'), xml.indexOf('name="aside"'));
    assert.equal(same.includes('intro="after"'), false);
    assert.equal((same.match(/<text>Alpha<\/text>/g) ?? []).length, 1);
    const blank = xml.slice(xml.indexOf('name="blank"'), xml.indexOf('name="same"'));
    assert.match(blank, /<text\/>\s*<text>Alpha<\/text>/);
    assert.match(xml.slice(xml.indexOf('name="aside"')), /intro="after"/);
  });

  it("round-trips offer rows and drops a row that is missing a band", () => {
    const events = [
      {
        id: "trade",
        dest: "Trade",
        flag: "cited:trade",
        aliases: [],
        sectors: [],
        body: "Deal.",
        offers: [
          {
            k: "trade" as const,
            pay: "parts" as const,
            cost: [1, 2] as [number, number],
            get: "fuel" as const,
            gain: [5, 10] as [number, number],
          },
          {
            k: "fuel" as const,
            band: "high" as const,
            fuel: [0, 0] as [number, number],
            pay: "scrap" as const,
            amt: [15, 25] as [number, number],
          },
          {
            k: "lanius" as const,
            band: "better" as const,
            res: "missiles" as const,
            cost: [3, 7] as [number, number],
            scrap: [25, 50] as [number, number],
          },
          {
            k: "supply" as const,
            missiles: [3, 5] as [number, number],
            parts: [0, 2] as [number, number],
            fuel: [0, 0] as [number, number],
          },
        ],
        choices: [{ id: "c:trade:0", label: "Take", fx: [{ k: "nothing" as const }] }],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<eventList name="high">/);
    assert.match(xml, /<eventList name="supply">/);
    assert.equal((xml.match(/<item type="fuel" min="0" max="0"\/>/g) ?? []).length, 2);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <eventList name="trade">
          <event>
            <item_modify>
              <item type="drones" min="-2" max="-1"/>
            </item_modify>
          </event>
          <event>
            <item_modify>
              <item type="fuel" min="1" max="1"/>
              <item type="missiles" min="4" max="4"/>
            </item_modify>
          </event>
          <event>
            <item_modify>
              <item type="drones" min="-1" max="-1"/>
              <item type="fuel" min="5" max="5"/>
            </item_modify>
          </event>
        </eventList>
        <eventList name="nope">
          <event>
            <item_modify>
              <item type="fuel" min="1" max="1"/>
              <item type="scrap" min="-2" max="-2"/>
            </item_modify>
          </event>
        </eventList>
        <eventList name="high">
          <event>
            <item_modify>
              <item type="scrap" min="2" max="4"/>
              <item type="drones" min="-2" max="-1"/>
            </item_modify>
          </event>
        </eventList>
        <choice name="c:broken:0">
          <text>Nested</text>
          <eventList name="trade">
            <event>
              <item_modify>
                <item type="fuel" min="-1" max="-1"/>
                <item type="missiles" min="4" max="4"/>
              </item_modify>
            </event>
          </eventList>
          <event/>
        </choice>
      </event>
    </FTL>`);
    assert.deepEqual(broken.events?.[0]?.offers, [
      { k: "trade", pay: "parts", cost: [1, 1], get: "fuel", gain: [5, 5] },
    ]);
    assert.equal(broken.events?.[0]?.choices[0]?.label, "Nested");
  });

  it("round-trips roll entries and drops an entry that has no text", () => {
    const events = [
      {
        id: "stand",
        dest: "Stand",
        flag: "cited:stand",
        aliases: [],
        sectors: [],
        body: "Fight.",
        rolls: [
          { k: "hull" as const, id: "Auto-Scout" },
          { k: "hull" as const, id: "Auto-Scout" },
          { k: "label" as const, text: "Stay quiet." },
          { k: "count" as const, n: 11, word: "eleven" },
        ],
        choices: [{ id: "c:stand:0", label: "Go", fx: [{ k: "nothing" as const }] }],
      },
    ];
    const xml = emitPack({ events });
    assert.equal((xml.match(/k="hull">Auto-Scout<\/roll>/g) ?? []).length, 2);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <roll k="hull"></roll>
        <roll k="nope">Hi</roll>
        <roll k="count">five</roll>
        <roll k="count" n="5.5">half</roll>
        <choice name="c:broken:0">
          <text>Nested</text>
          <roll k="hull">Nested</roll>
        </choice>
      </event>
    </FTL>`);
    assert.equal(broken.events?.[0]?.rolls, undefined);
    assert.equal(broken.events?.[0]?.choices[0]?.label, "Nested");
  });

  it("round-trips opening cards and drops a card that has no body", () => {
    const events = [
      {
        id: "refugee",
        dest: "Refugee",
        flag: "cited:refugee",
        aliases: [],
        sectors: [],
        body: "",
        cards: [
          { body: "Low fuel.", choices: [{ id: "c:refugee:low", label: "Continue" }] },
          {
            body: "Damaged hull.",
            choices: [
              { id: "c:refugee:trade", label: "Trade" },
              { id: "c:refugee:engi", label: "Negotiate" },
            ],
          },
        ],
        choices: [{ id: "c:refugee:0", label: "Continue", fx: [{ k: "nothing" as const }] }],
      },
    ];
    const xml = emitPack({ events });
    assert.equal((xml.match(/<card>/g) ?? []).length, 2);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text></text>
        <card><text></text><choice name="c:broken:empty"><text>Nope</text></choice></card>
        <card><text>No buttons.</text></card>
        <card><text>Low fuel.</text><choice><text>Nameless</text></choice></card>
        <choice name="c:broken:0">
          <text>Nested</text>
          <card><text>Hidden</text><choice name="c:broken:hidden"><text>Hidden</text></choice></card>
          <event/>
        </choice>
      </event>
    </FTL>`);
    assert.equal(broken.events?.[0]?.cards, undefined);
    assert.equal(broken.events?.[0]?.choices[0]?.label, "Nested");
    assert.equal(broken.events?.[0]?.body, "");
  });

  it("round-trips choice locks and drops a lock with no refusal", () => {
    const events = [
      {
        id: "locked",
        dest: "Locked",
        flag: "cited:locked",
        aliases: [],
        sectors: [],
        body: "A button.",
        cards: [
          {
            body: "Opening.",
            choices: [
              {
                id: "c:locked:engi",
                label: "Negotiate",
                reqs: [{ k: "crew" as const, id: "engi", text: "Needs an Engi crewmember." }],
              },
            ],
          },
        ],
        choices: [
          {
            id: "c:locked:go",
            label: "Go",
            reqs: [
              { k: "system" as const, id: "medbay", level: 2, text: "Needs a level 2 Medbay." },
              { k: "band" as const, id: "engines", lo: 3, hi: 5, text: "Needs Engines level 3-5." },
              { k: "stock" as const, id: "parts", n: 1, text: "Need 1 drone part." },
              { k: "augment" as const, id: "ADV_SCANNERS", text: "Needs a Crystal Vengeance." },
              { k: "weapon" as const, id: "BEAM_BIO", text: "Needs an Anti-Bio Beam." },
              { k: "family" as const, id: "missile", text: "Needs a missile weapon." },
              { k: "drone" as const, id: "COMBAT_BEAM", text: "Needs a beam drone." },
            ],
            fx: [{ k: "nothing" as const }],
          },
        ],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<crewMember name="engi"\/>/);
    assert.match(xml, /req="engines" lvl="3" max_lvl="5"/);
    assert.match(xml, /<item type="drones" min="-1" max="-1"\/>/);
    assert.match(xml, /<drone name="COMBAT_BEAM"\/>/);
    assert.match(xml, /<req req="missile">/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <choice name="c:broken:0">
          <text>Go</text>
          <req><crewMember name="engi"/></req>
          <req req="nope">Nope.</req>
          <req req="engines" lvl="5" max_lvl="3">Backwards.</req>
          <req>
            <item_modify><item type="scrap" min="-5" max="-1"/></item_modify>
            Range.
          </req>
          <req>
            <item_modify><item type="scrap" min="-1.5" max="-1.5"/></item_modify>
            Half.
          </req>
          <req req="engines">No level.</req>
          <event/>
        </choice>
      </event>
    </FTL>`);
    assert.equal(broken.events?.[0]?.choices[0]?.reqs, undefined);
    assert.equal(broken.events?.[0]?.choices[0]?.fx.length, 1);
  });

  it("round-trips a fuel gift and drops a gift with no band", () => {
    const events = [
      {
        id: "gifted",
        dest: "Gifted",
        flag: "cited:gifted",
        aliases: [],
        sectors: [],
        body: "A button.",
        cards: [
          {
            body: "Opening.",
            choices: [
              {
                id: "c:gifted:take",
                label: "Take it.",
                gift: { k: "fuel" as const, lo: 3, hi: 3 },
              },
            ],
          },
        ],
        choices: [
          {
            id: "c:gifted:go",
            label: "Go",
            gift: { k: "fuel" as const, lo: 4, hi: 6 },
            fx: [{ k: "nothing" as const }],
          },
          {
            id: "c:gifted:find",
            label: "Find fuel",
            fx: [{ k: "res" as const, id: "fuel" as const, sign: 1 as const, lo: 1, hi: 3 }],
          },
        ],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<item type="fuel" min="4" max="6"\/>/);
    assert.match(xml, /<item type="fuel" min="3" max="3"\/>/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <card>
          <text>Opening.</text>
          <choice name="c:broken:take">
            <text>Take</text>
            <item_modify><item type="fuel" min="6" max="4"/></item_modify>
          </choice>
        </card>
        <choice name="c:broken:0">
          <text>Go</text>
          <event>
            <item_modify><item type="scrap" min="1" max="2"/></item_modify>
          </event>
          <event>
            <item_modify><item type="fuel" min="6" max="4"/></item_modify>
          </event>
          <event>
            <item_modify><item type="fuel" min="1.5" max="2"/></item_modify>
          </event>
          <item_modify><item type="fuel" min="2" max="4"/></item_modify>
        </choice>
      </event>
    </FTL>`);
    assert.equal(broken.events?.[0]?.cards?.[0]?.choices[0]?.gift, undefined);
    assert.equal(broken.events?.[0]?.choices[0]?.gift, undefined);
    assert.deepEqual(broken.events?.[0]?.choices[0]?.fx, [
      { k: "nothing" },
      { k: "nothing" },
      { k: "nothing" },
      { k: "res", id: "fuel", sign: 1, lo: 2, hi: 4 },
    ]);
  });

  it("round-trips named prices and keeps the first row for an id", () => {
    const events = [
      {
        id: "checkpoint",
        dest: "Checkpoint",
        flag: "cited:checkpoint",
        aliases: [],
        sectors: [],
        body: "A fleet.",
        prices: [
          { id: "bribe", k: "scrap" as const, lo: 10, hi: 15 },
          { id: "give", k: "fuel" as const, lo: 2, hi: 4 },
        ],
        choices: [{ id: "c:checkpoint:0", label: "Attack", fx: [{ k: "nothing" as const }] }],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<item_modify name="bribe">/);
    assert.match(xml, /<item type="scrap" min="10" max="15"\/>/);
    assert.match(xml, /<item type="fuel" min="2" max="4"\/>/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <item_modify><item type="scrap" min="10" max="15"/></item_modify>
        <item_modify name="debt"><item type="missiles" min="1" max="2"/></item_modify>
        <item_modify name="debt"><item type="scrap" min="15" max="10"/></item_modify>
        <item_modify name="debt"><item type="scrap" min="1.5" max="2"/></item_modify>
        <item_modify name="bribe"><item type="scrap" min="8" max="8"/></item_modify>
        <item_modify name="bribe"><item type="scrap" min="20" max="30"/></item_modify>
        <item_modify name="scan"><item type="scrap" min="15" max="25"/></item_modify>
        <choice name="c:broken:0">
          <text>Go</text>
          <item_modify name="nested"><item type="scrap" min="1" max="2"/></item_modify>
          <event/>
        </choice>
      </event>
    </FTL>`);
    assert.deepEqual(broken.events?.[0]?.prices, [
      { id: "bribe", k: "scrap", lo: 8, hi: 8 },
      { id: "scan", k: "scrap", lo: 15, hi: 25 },
    ]);
  });

  it("round-trips printed bands and keeps the first row for an id and a kind", () => {
    const events = [
      {
        id: "drones",
        dest: "Drones",
        flag: "cited:drones",
        aliases: [],
        sectors: [],
        body: "A salesman.",
        prices: [{ id: "bribe", k: "scrap" as const, lo: 10, hi: 15 }],
        bands: [
          { id: "low", k: "scrap" as const, lo: 15, hi: 20 },
          { id: "low", k: "level" as const, lo: 2, hi: 3 },
          { id: "scan", k: "parts" as const, lo: 1, hi: 3 },
        ],
        choices: [{ id: "c:drones:0", label: "Buy", fx: [{ k: "nothing" as const }] }],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<item_modify name="low">/);
    assert.match(xml, /<item type="level" min="2" max="3"\/>/);
    assert.match(xml, /<item type="drones" min="1" max="3"\/>/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <eventList>
          <event><item_modify><item type="scrap" min="15" max="20"/></item_modify></event>
          <event><item_modify name=""><item type="scrap" min="15" max="20"/></item_modify></event>
          <event><item_modify name="scan"><item type="crew" min="1" max="2"/></item_modify></event>
          <event><item_modify name="scan"><item type="scrap" min="30" max="10"/></item_modify></event>
          <event><item_modify name="scan"><item type="scrap" min="1.5" max="2"/></item_modify></event>
          <event><item_modify name="scan"><item type="scrap" min="8" max="8"/></item_modify></event>
          <event><item_modify name="scan"><item type="scrap" min="20" max="35"/></item_modify></event>
          <event><item_modify name="scan"><item type="drones" min="1" max="3"/></item_modify></event>
          <event><item_modify name="low"><item type="missiles" min="2" max="4"/></item_modify></event>
        </eventList>
        <choice name="c:broken:0">
          <text>Go</text>
          <eventList>
            <event><item_modify name="nested"><item type="scrap" min="1" max="2"/></item_modify></event>
          </eventList>
          <event/>
        </choice>
      </event>
    </FTL>`);
    assert.deepEqual(broken.events?.[0]?.bands, [
      { id: "scan", k: "scrap", lo: 8, hi: 8 },
      { id: "scan", k: "parts", lo: 1, hi: 3 },
      { id: "low", k: "missiles", lo: 2, hi: 4 },
    ]);
    assert.equal(broken.events?.[0]?.prices, undefined);
  });

  it("round-trips trade bands and keeps the first row for a specialty and level", () => {
    const events = [
      {
        id: "traders",
        dest: "Traders",
        flag: "cited:traders",
        aliases: [],
        sectors: [],
        body: "A stall.",
        trades: [
          { id: "oxygen", level: 1, lo: 15, hi: 20 },
          { id: "reactor", lo: 15, hi: 25 },
        ],
        choices: [{ id: "c:traders:0", label: "Inquire", fx: [{ k: "nothing" as const }] }],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<trade id="oxygen" level="1" lo="15" hi="20"\/>/);
    assert.match(xml, /<trade id="reactor" lo="15" hi="25"\/>/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <trade lo="15" hi="20"/>
        <trade id="" level="1" lo="15" hi="20"/>
        <trade id="oxygen" level="1" lo="30" hi="10"/>
        <trade id="oxygen" level="1.5" lo="15" hi="20"/>
        <trade id="oxygen" level="-1" lo="15" hi="20"/>
        <trade id="oxygen" level="1" lo="15" hi="20"/>
        <trade id="oxygen" level="1" lo="99" hi="99"/>
        <trade id="pilot" lo="8" hi="15"/>
        <trade id="reactor" lo="15" hi="25"/>
        <trade id="reactor" lo="99" hi="99"/>
        <trade id="ember" level="2" lo="4" hi="4"/>
        <choice name="c:broken:0">
          <text>Go</text>
          <trade id="nested" level="1" lo="1" hi="2"/>
          <event/>
        </choice>
      </event>
    </FTL>`);
    assert.deepEqual(broken.events?.[0]?.trades, [
      { id: "oxygen", level: 1, lo: 15, hi: 20 },
      { id: "pilot", lo: 8, hi: 15 },
      { id: "reactor", lo: 15, hi: 25 },
      { id: "ember", level: 2, lo: 4, hi: 4 },
    ]);
  });

  it("round-trips a moon grade and drops a grade with no hire", () => {
    const events = [
      {
        id: "moons",
        dest: "Moons",
        flag: "cited:moons",
        aliases: [],
        sectors: [],
        body: "A planet.",
        grade: {
          hire: "Slug",
          pays: [
            { k: "scrap" as const, lo: 35, hi: 35 },
            { k: "fuel" as const, lo: 2, hi: 4 },
            { k: "parts" as const, lo: 1, hi: 2 },
          ],
        },
        choices: [{ id: "c:moons:0", label: "Investigate", fx: [{ k: "nothing" as const }] }],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<grade hire="Slug">/);
    assert.match(xml, /<pay k="scrap" lo="35" hi="35"\/>/);
    assert.match(xml, /<pay k="fuel" lo="2" hi="4"\/>/);
    assert.match(xml, /<pay k="parts" lo="1" hi="2"\/>/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <grade hire="">
          <pay k="scrap" lo="35" hi="35"/>
        </grade>
        <grade>
          <pay k="fuel" lo="2" hi="4"/>
        </grade>
        <grade hire="Engi">
          <pay k="missiles" lo="1" hi="2"/>
          <pay k="fuel" lo="4" hi="1"/>
          <pay k="parts" lo="1.5" hi="2"/>
        </grade>
        <choice name="c:broken:0">
          <text>Go</text>
          <grade hire="Slug"><pay k="scrap" lo="1" hi="1"/></grade>
          <event/>
        </choice>
      </event>
      <event name="kept" flag="cited:kept">
        <title>Kept</title>
        <text>Body</text>
        <grade hire="">
          <pay k="scrap" lo="1" hi="1"/>
        </grade>
        <grade hire="Rock">
          <pay k="scrap" lo="8" hi="8"/>
          <pay k="parts" lo="1" hi="1"/>
        </grade>
        <choice name="c:kept:0"><text>Go</text><event/></choice>
      </event>
    </FTL>`);
    assert.equal(broken.events?.[0]?.grade, undefined);
    assert.deepEqual(broken.events?.[1]?.grade, {
      hire: "Rock",
      pays: [
        { k: "scrap", lo: 8, hi: 8 },
        { k: "parts", lo: 1, hi: 1 },
      ],
    });
  });

  it("writes choice results with the hyperspace tags", () => {
    const events = [
      {
        id: "pay",
        dest: "Pay",
        flag: "cited:pay",
        aliases: [],
        sectors: [],
        body: "A toll.",
        choices: [
          {
            id: "c:pay:0",
            label: "Pay",
            fx: [
              { k: "res" as const, id: "parts" as const, sign: -1 as const, lo: 1, hi: 2 },
              { k: "fight" as const, tier: "Auto-ship", asteroid: true },
              { k: "hull" as const, n: 5 },
              { k: "fleet" as const, n: 2, lastStand: true },
              { k: "note" as const, text: "The gate opens." },
              { k: "nothing" as const },
              { k: "goto" as const, id: "next" },
              { k: "item" as const, item: "weapon" as const },
            ],
          },
        ],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<item type="drones" min="-2" max="-1"\/>/);
    assert.match(xml, /<ship hostile="true" load="Auto-ship" asteroid="true"\/>/);
    assert.match(xml, /<damage amount="-5"\/>/);
    assert.match(xml, /<modifyPursuit amount="-2" lastStand="true"\/>/);
    assert.match(xml, /<event load="next"\/>/);
    assert.match(xml, /<weapon\/>/);
    assert.doesNotMatch(xml, /<effect k="res"/);
    assert.deepEqual(parsePack(xml).events, events);
    const retired = parsePack(`<FTL>
      <event name="pay" flag="cited:pay">
        <title>Pay</title>
        <text>A toll.</text>
        <bribe k="scrap" lo="1" hi="1"/>
        <offer k="trade" pay="parts" cost="1-2" get="fuel" gain="5-10"/>
        <price id="bribe" k="scrap" lo="10" hi="15"/>
        <band id="low" k="scrap" lo="15" hi="20"/>
        <choice name="c:pay:0">
          <text>Pay</text>
          <gift k="fuel" lo="1" hi="1"/>
          <req k="system" id="medbay" level="2">Needs a level 2 Medbay.</req>
          <effect k="res" id="scrap" sign="-1" lo="10" hi="15"/>
          <effect k="fight" tier="pirate"/>
          <effect k="note">Gone.</effect>
          <effect k="goto" id="next"/>
          <effect k="nothing"/>
          <effect k="hull" n="5"/>
          <effect k="fleet" n="2"/>
          <effect k="item" item="weapon"/>
        </choice>
      </event>
      <eventBlueprint name="old" flag="cited:old">
        <title>Old</title>
        <text>Gone.</text>
      </eventBlueprint>
    </FTL>`);
    assert.equal(retired.events?.length, 1);
    assert.equal(retired.events?.[0]?.offers, undefined);
    assert.equal(retired.events?.[0]?.prices, undefined);
    assert.equal(retired.events?.[0]?.bands, undefined);
    assert.equal(retired.events?.[0]?.choices[0]?.gift, undefined);
    assert.equal(retired.events?.[0]?.choices[0]?.reqs, undefined);
    assert.deepEqual(retired.events?.[0]?.choices[0]?.fx, []);
  });

  it("skips a nameless list and an empty beacon with no sentences", () => {
    const back = parsePack(`<FTL>
      <eventList><event name="orphan" unique="true"/></eventList>
      <eventList name="empty"/>
      <eventList name="ember"><event unique="true"/><event name="kept"/></eventList>
      <eventList name="retired"><event id="kept" unique="true"/></eventList>
      <emptyBeacon name="quiet"><title>Quiet</title></emptyBeacon>
      <emptyBeacon><title>No name</title><text>Hi</text></emptyBeacon>
      <emptyBeacon name="kept" nebula="true"><title>Kept</title><sector>Ember</sector><text>Still.</text></emptyBeacon>
    </FTL>`);
    assert.deepEqual(back.lists, [{ id: "ember", entries: [{ id: "kept", unique: false }] }]);
    assert.equal(back.events?.some((row) => row.id === "kept"), false);
    assert.deepEqual(back.empties, [
      { id: "kept", dest: "Kept", sectors: ["Ember"], texts: ["Still."], nebula: true },
    ]);
  });

  it("does not read a retired store, tune, list id, or surrender spelling", () => {
    const back = parsePack(`<FTL>
      <systemTune name="old"><start>2</start></systemTune>
      <storeBlueprint name="old"><title>Old</title></storeBlueprint>
      <event name="page" flag="cited:page">
        <title>Page</title>
        <text>Hi</text>
        <surrender chance="10" low="1" high="2">
          <text>Yield</text>
          <reward k="weapon" name="Anti-Bio Beam"/>
          <choice name="surrender-accept"><text>Spare</text></choice>
        </surrender>
      </event>
      <event name="old-reward" flag="cited:old-reward">
        <title>Old</title>
        <text>Hi</text>
        <surrender chance="10" min="1" max="2">
          <text>Yield</text>
          <reward k="weapon" name="Anti-Bio Beam"/>
          <choice name="surrender-accept"><text>Spare</text></choice>
        </surrender>
      </event>
    </FTL>`);
    assert.deepEqual(back.tunes, []);
    assert.deepEqual(back.stores, []);
    assert.equal(back.events?.[0]?.surrender, undefined);
    assert.deepEqual(back.events?.[1]?.surrender?.reward, { k: "none" });
  });

  it("round-trips the other surrender rewards", () => {
    const rewards = [
      { k: "stuff" as const },
      { k: "stuff" as const, tier: "high" as const },
      { k: "standard" as const, tier: "low" as const, race: "Zoltan" },
      { k: "scrap" as const, tier: "medium" as const, unnamed: "drone" as const },
      { k: "crew" as const },
      { k: "crew" as const, race: "Engi" },
      { k: "fuel-repairs" as const, repairs: 5 },
      { k: "none" as const },
    ];
    const events = rewards.map((reward, index) => ({
      id: `pay-${index}`,
      dest: "Pay",
      flag: `cited:pay-${index}`,
      aliases: [],
      sectors: [],
      body: "Hi",
      choices: [],
      surrender: {
        chance: 10,
        low: 1,
        high: 2,
        reward,
        hail: "Yield",
        accept: "Spare",
        refuse: "",
      },
    }));
    assert.deepEqual(parsePack(emitPack({ events })).events, events);
  });

  it("round-trips weapon bays, hull points, and a two-line unlock, and leaves a bare hull without them", () => {
    const counted: HullDef = {
      id: "slot-ship",
      cruiser: "",
      layout: "kestral",
      name: "Slots",
      quote: "",
      unlock: "First line.\nSecond line.",
      source: "",
      reactor: 0,
      fuel: 0,
      missiles: 0,
      parts: 0,
      systems: {},
      weapons: [],
      crew: [],
      kits: {},
      augments: [],
      unfitted: [],
      weaponSlots: 4,
      droneSlots: 3,
      health: 18,
    };
    const bare: HullDef = {
      id: "bare-ship",
      cruiser: "",
      layout: "kestral",
      name: "Bare",
      quote: "",
      unlock: "",
      source: "",
      reactor: 0,
      fuel: 0,
      missiles: 0,
      parts: 0,
      systems: {},
      weapons: [],
      crew: [],
      kits: {},
      augments: [],
      unfitted: [],
    };
    const xml = emitPack({ hulls: [counted, bare] });
    const back = parsePack(xml);
    const slots = back.hulls?.find((hull) => hull.id === "slot-ship");
    const plain = back.hulls?.find((hull) => hull.id === "bare-ship");
    assert.equal(slots?.weaponSlots, 4);
    assert.equal(slots?.droneSlots, 3);
    assert.equal(slots?.health, 18);
    assert.match(xml, /<health amount="18"\/>/);
    assert.equal((xml.match(/<health\b/g) ?? []).length, 1);
    assert.deepEqual(slots?.unlock.split("\n"), ["First line.", "Second line."]);
    assert.equal(plain?.weaponSlots, undefined);
    assert.equal(plain?.droneSlots, undefined);
    assert.equal(plain?.health, undefined);
  });

  it("round-trips names that contain markup characters", () => {
    const crew = pack.crew?.[0];
    assert.ok(crew);
    const odd: ContentPack = {
      crew: [{ ...crew, id: `a"b`, name: "Rock & <Stone>'s" }],
    };
    const back = parsePack(emitPack(odd));
    assert.equal(back.crew?.[0]?.id, `a"b`);
    assert.equal(back.crew?.[0]?.name, "Rock & <Stone>'s");
  });

  it("reads a title stored as character data", () => {
    const back = parsePack(`<FTL><race name="human"><title><![CDATA[A & B]]></title></race></FTL>`);
    assert.equal(back.crew?.[0]?.name, "A & B");
  });

  it("rejects XML that is not well-formed", () => {
    assert.throws(() => parsePack("<race></crew>"), /not well-formed/);
    assert.throws(() => parsePack("<a/><b/>"), /not well-formed/);
    assert.throws(() => parsePack(`<FTL a=1></FTL>`), /not well-formed/);
  });

  it("keeps a shared id on separate maps and restores the base rows", () => {
    loadPack(pack, "base");
    assert.equal(crewDef("ember").hp, 40);
    assert.equal(weaponDef("ember")?.charge, 7);
    assert.equal(crewDef("missing").name, "Human");
    loadPack(
      {
        weapons: [{ ...laser, charge: 9 }],
        tunes: [{ id: "ember", start: 4, costs: [] }],
        lists: [{ id: "ember-extra", entries: [{ id: "one", unique: true }] }],
        empties: [{ id: "ember-other", dest: "Other", sectors: [], texts: ["Gone."] }],
      },
      "append",
    );
    assert.equal(weaponDef("ember")?.charge, 9);
    assert.equal(crewDef("ember").hp, 40);
    assert.equal(tuneDef("ember")?.start, 4);
    assert.equal(tuneDef("shields")?.start, 2);
    assert.equal(fillerList("ember-list")?.entries.length, 2);
    assert.equal(fillerList("ember-extra")?.entries[0]?.id, "one");
    assert.equal(emptyBeacon("ember-quiet")?.nebula, true);
    assert.equal(emptyBeacon("ember-other")?.dest, "Other");
    resetPackForTests();
    assert.equal(weaponDef("ember")?.charge, 7);
    assert.equal(tuneDef("ember"), undefined);
    assert.equal(eventDef("ember")?.body, "A packed beacon.");
    assert.equal(fillerList("ember-extra"), undefined);
    assert.equal(fillerList("ember-list")?.entries.length, 2);
    assert.equal(emptyBeacon("ember-other"), undefined);
    assert.equal(emptyBeacon("ember-quiet")?.dest, "Ember quiet");
  });
});
