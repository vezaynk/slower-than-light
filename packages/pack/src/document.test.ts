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
import type { ContentPack, WeaponBlueprint } from "./types.ts";

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
      id: "plain",
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
  tunes: [{ id: "shields", start: 2, costs: [{ level: 1, cost: 100 }] }],
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
    assert.deepEqual(back.tunes, pack.tunes);
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
    assert.match(xml, /k="fuel"[^>]*fuel="0-0"/);
    assert.match(xml, /k="supply"[^>]*fuel="0-0"/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <offer k="trade" pay="parts" cost="1-2" get="fuel"/>
        <offer k="nope" pay="parts" cost="1-2" get="fuel" gain="1-1"/>
        <offer k="fuel" fuel="2-4" pay="parts" amt="1-2"/>
        <choice name="c:broken:0">
          <text>Nested</text>
          <offer k="trade" pay="fuel" cost="1-1" get="missiles" gain="4-4"/>
        </choice>
      </event>
    </FTL>`);
    assert.equal(broken.events?.[0]?.offers, undefined);
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
                reqs: [{ k: "crew" as const, id: "shell", text: "Needs an Engi crewmember." }],
              },
            ],
          },
        ],
        choices: [
          {
            id: "c:locked:go",
            label: "Go",
            reqs: [
              { k: "band" as const, id: "engines", lo: 3, hi: 5, text: "Needs Engines level 3-5." },
              { k: "stock" as const, id: "scrap", n: 10, text: "Need 10 scrap." },
            ],
            fx: [{ k: "nothing" as const }],
          },
        ],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<req k="crew" id="shell">Needs an Engi crewmember\.<\/req>/);
    assert.match(xml, /<req k="band" id="engines" lo="3" hi="5">/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <choice name="c:broken:0">
          <text>Go</text>
          <req k="crew" id="shell"></req>
          <req k="nope" id="shell">Nope.</req>
          <req k="band" id="engines" lo="5" hi="3">Backwards.</req>
          <req k="stock" id="scrap" n="1.5">Half.</req>
          <req k="system" id="engines">No level.</req>
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
        ],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<gift k="fuel" lo="4" hi="6"\/>/);
    assert.match(xml, /<gift k="fuel" lo="3" hi="3"\/>/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <choice name="c:broken:0">
          <text>Go</text>
          <gift k="scrap" lo="1" hi="2"/>
          <gift k="fuel" lo="6" hi="4"/>
          <gift k="fuel" lo="1.5" hi="2"/>
          <event/>
        </choice>
      </event>
    </FTL>`);
    assert.equal(broken.events?.[0]?.choices[0]?.gift, undefined);
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
    assert.match(xml, /<price id="bribe" k="scrap" lo="10" hi="15"\/>/);
    assert.match(xml, /<price id="give" k="fuel" lo="2" hi="4"\/>/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <price k="scrap" lo="10" hi="15"/>
        <price id="debt" k="missiles" lo="1" hi="2"/>
        <price id="debt" k="scrap" lo="15" hi="10"/>
        <price id="debt" k="scrap" lo="1.5" hi="2"/>
        <price id="bribe" k="scrap" lo="8" hi="8"/>
        <price id="bribe" k="scrap" lo="20" hi="30"/>
        <price id="scan" k="scrap" lo="15" hi="25"/>
        <choice name="c:broken:0">
          <text>Go</text>
          <price id="nested" k="scrap" lo="1" hi="2"/>
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
        bands: [
          { id: "low", k: "scrap" as const, lo: 15, hi: 20 },
          { id: "low", k: "level" as const, lo: 2, hi: 3 },
          { id: "scan", k: "parts" as const, lo: 1, hi: 3 },
        ],
        choices: [{ id: "c:drones:0", label: "Buy", fx: [{ k: "nothing" as const }] }],
      },
    ];
    const xml = emitPack({ events });
    assert.match(xml, /<band id="low" k="scrap" lo="15" hi="20"\/>/);
    assert.match(xml, /<band id="low" k="level" lo="2" hi="3"\/>/);
    assert.match(xml, /<band id="scan" k="parts" lo="1" hi="3"\/>/);
    assert.deepEqual(parsePack(xml).events, events);
    const broken = parsePack(`<FTL>
      <event name="broken" flag="cited:broken">
        <title>Broken</title>
        <text>Body</text>
        <band k="scrap" lo="15" hi="20"/>
        <band id="" k="scrap" lo="15" hi="20"/>
        <band id="scan" k="crew" lo="1" hi="2"/>
        <band id="scan" k="scrap" lo="30" hi="10"/>
        <band id="scan" k="scrap" lo="1.5" hi="2"/>
        <band id="scan" k="scrap" lo="8" hi="8"/>
        <band id="scan" k="scrap" lo="20" hi="35"/>
        <band id="scan" k="parts" lo="1" hi="3"/>
        <band id="low" k="missiles" lo="2" hi="4"/>
        <choice name="c:broken:0">
          <text>Go</text>
          <band id="nested" k="scrap" lo="1" hi="2"/>
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
        <choice name="c:pay:0">
          <text>Pay</text>
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
    assert.equal(retired.events?.[0]?.prices, undefined);
    assert.deepEqual(retired.events?.[0]?.choices[0]?.fx, []);
  });

  it("skips a nameless list and an empty beacon with no sentences", () => {
    const back = parsePack(`<FTL>
      <eventList><event id="orphan" unique="true"/></eventList>
      <eventList name="ember"><event unique="true"/><event id="kept"/></eventList>
      <emptyBeacon name="quiet"><title>Quiet</title></emptyBeacon>
      <emptyBeacon><title>No name</title><text>Hi</text></emptyBeacon>
      <emptyBeacon name="kept" nebula="true"><title>Kept</title><sector>Ember</sector><text>Still.</text></emptyBeacon>
    </FTL>`);
    assert.deepEqual(back.lists, [{ id: "ember", entries: [{ id: "kept", unique: false }] }]);
    assert.deepEqual(back.empties, [
      { id: "kept", dest: "Kept", sectors: ["Ember"], texts: ["Still."], nebula: true },
    ]);
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
    const back = parsePack(`<FTL><race name="plain"><title><![CDATA[A & B]]></title></race></FTL>`);
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
