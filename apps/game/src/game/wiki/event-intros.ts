import { tx } from "../../i18n/index.ts";

/**
 * Opening sentences for a beacon page. The pack stores them on the event.
 * The sim still picks one when the card opens, with the same between or rand draw.
 * A list shared by two pages is one array. Choice handlers stay in the event modules.
 */

const TRADE_RESOURCE_INTROS = [
  tx("wiki.cited-events.you-arrive-at-a-quiet-spaceport"),
  tx("wiki.cited-events.you-jump-into-a-sector-filled"),
  tx("wiki.cited-events.your-ship-is-flooded-with-advertisement"),
  tx("wiki.cited-events.despite-the-barren-area-a-trader"),
  tx("wiki.cited-events.the-beacon-at-first-glance-seems"),
  tx("wiki.cited-events.a-pawn-broker-has-set-up"),
];

// Lanius trader. The page prints three intros and no odds. INFERRED: equal.
const LANIUS_TRADER_INTROS = [
  tx("wiki.cited-events.aided-by-a-modified-translator-a"),
  tx("wiki.cited-events.a-small-lanius-craft-approaches-you"),
  tx("wiki.cited-events.you-arrive-to-find-a-large"),
];

// Pirate fight. The page prints five intros and then a default Pirate ship fight, and it prints no odds.
// INFERRED: the five intros are equally likely.
const PIRATE_FIGHT_INTROS = [
  tx("wiki.cited-events.as-you-jump-into-the-system"),
  tx("wiki.cited-events.soon-after-arriving-in-the-system"),
  tx("wiki.cited-events.at-first-it-appears-you-ve"),
  tx("wiki.cited-events.the-only-other-ship-at-this"),
  tx("wiki.cited-events.you-barely-have-time-to-register"),
];

// Free scrap with resources. The page prints six intros and no odds.
// INFERRED: equal. The gift stays c:free-scrap-with-resources:0.
const FREE_SCRAP_WITH_RESOURCES_INTROS = [
  tx("wiki.cited-events.you-arrive-in-a-system-and"),
  tx("wiki.cited-events.not-much-remains-in-this-abandoned"),
  tx("wiki.cited-events.as-you-arrive-in-the-system"),
  tx("wiki.cited-events.debris-from-a-forgotten-battle-still"),
  tx("wiki.cited-events.you-receive-a-message-from-a"),
  tx("wiki.cited-events.you-happen-upon-the-remains-of"),
];

// Slug fight in plasma storm. The page prints four intros and no odds.
// INFERRED: equal. The fight stays c:slug-fight-in-plasma-storm:0.
// Pirate ship distress trap. The page prints four intros and no odds.
// INFERRED: equal. The fight stays c:pirate-ship-distress-trap:0.
const PIRATE_DISTRESS_TRAP_INTROS = [
  tx("wiki.cited-events.you-arrive-at-the-beacon-and"),
  tx("wiki.cited-events.haha-i-knew-someone-would-fall"),
  tx("wiki.cited-events.your-cockpit-lights-up-with-warning"),
  tx("wiki.cited-events.as-soon-as-you-arrive-at"),
];

const SLUG_PLASMA_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in plasma storm]]
  // > "The ion storm here threatens to deactivate your core systems, a fact made all the worse for the largely unaffected Slug ships circling like space-vultures." — [[Slug fight in plasma storm]]
  // > "The Slug ship that descends into view as you enter the ion storm must have sensed your distress - defensive action!" — [[Slug fight in plasma storm]]
  // > "You arrive in the middle of an ion storm. Slugs generally avoid these storms but you find one waiting in ambush. Prepare for a fight!" — [[Slug fight in plasma storm]]
  // > "You find yourself stuck in the middle of an ion storm with a Slug ship just a short distance away, refusing all hails. You cautiously try to slip further into the clouds, but they turn suddenly to attack!" — [[Slug fight in plasma storm]]
  tx("wiki.cited-events.the-ion-storm-here-threatens-to"),
  tx("wiki.cited-events.the-slug-ship-that-descends-into"),
  tx("wiki.cited-events.you-arrive-in-the-middle-of-2"),
  tx("wiki.cited-events.you-find-yourself-stuck-in-the"),
];

// Free weapon. The page prints six intros and no odds.
// INFERRED: equal. The gift stays c:free-weapon:0.
const FREE_WEAPON_INTROS = [
  tx("wiki.cited-events.holy-crap-a-weapon-is-just"),
  tx("wiki.cited-events.you-inform-a-nearby-station-of"),
  tx("wiki.cited-events.a-settlement-still-loyal-to-the"),
  tx("wiki.cited-events.as-soon-as-you-arrive-a"),
  tx("wiki.cited-events.a-small-merchant-ship-messages-you"),
  tx("wiki.cited-events.debris-from-a-battle-is-scattered"),
];

// Rebel checkpoint. Four intros and four hide labels, no odds. INFERRED: equal.
const REBEL_CHECKPOINT_INTROS = [
  tx("wiki.cited-events.a-rather-large-fleet-of-civilian"),
  tx("wiki.cited-events.another-rebel-checkpoint-is-monitoring-this"),
  tx("wiki.cited-events.a-rebel-space-station-and-single"),
  tx("wiki.cited-events.it-looks-like-this-beacon-is"),
];
// Pirate fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-near-pulsar:0.
const PIRATE_PULSAR_INTROS = [
  tx("wiki.cited-events.sensors-go-wild-as-a-nearby"),
  tx("wiki.cited-events.you-arrive-to-find-a-pulsar"),
  tx("wiki.cited-events.a-small-research-station-orbits-a"),
];

// Rock fight. Eight printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight:0.
const ROCK_FIGHT_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight]]
  // > "You encounter a Rock vessel and attempt to open trading frequencies, but they take it as an act of cultural transgression and open fire." — [[Rock fight]]
  // > "You jump into the middle of a Rock excavation project on a nearby moon. Unimpressed with your intrusion they move to defend themselves!" — [[Rock fight]]
  // > "You intercept chatter from an approaching Rock ship: \"Weapons, moving in to engage, arm the tubes.\" There is no talking to these guys." — [[Rock fight]]
  // > "As you jump in, a vast figure appears on the view-screen. The Rock captain rubs the green, moss-like appendage on his chin and then orders his crew to open fire." — [[Rock fight]]
  // > "It looks quiet, but you realize your computer is being scanned. A hidden Rock vessel hails you: \"Why do you fill your computer with lies?! These are not the holy words!\" Before you can interject they open fire." — [[Rock fight]]
  // > "You notice a Rock ship performing combat exercises. However, they quickly change their course to engage your ship. They apparently treat unregistered alien ships as handy target practice." — [[Rock fight]]
  // > "A loud 'thud' resounds through the ship after jump completion - you've just shunted a Rock fighter and he's already preparing to fire!" — [[Rock fight]]
  // > "You're intercepted by a Rock salvage operation. They don't seem to mind that you're still on board while they junk your ship." — [[Rock fight]]
  tx("wiki.cited-events.you-encounter-a-rock-vessel-and"),
  tx("wiki.cited-events.you-jump-into-the-middle-of"),
  tx("wiki.cited-events.you-intercept-chatter-from-an-approaching"),
  tx("wiki.cited-events.as-you-jump-in-a-vast"),
  tx("wiki.cited-events.it-looks-quiet-but-you-realize"),
  tx("wiki.cited-events.you-notice-a-rock-ship-performing"),
  tx("wiki.cited-events.a-loud-thud-resounds-through-the"),
  tx("wiki.cited-events.you-re-intercepted-by-a-rock"),
];

// Rebel fight (Lanius). Six printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-lanius:0.
const LANIUS_REBEL_INTROS = [
  tx("wiki.cited-events.you-intercept-discussions-between-a-rebel"),
  tx("wiki.cited-events.you-arrive-to-see-a-number"),
  tx("wiki.cited-events.a-rebel-scout-patrols-near-the"),
  tx("wiki.cited-events.you-arrive-at-the-beacon-and-2"),
  tx("wiki.cited-events.a-rebel-messages-you-who-would"),
  tx("wiki.cited-events.your-arrival-coincides-almost-exactly-with"),
];

// Rock fight with boarders. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-with-boarders:0.
const ROCK_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders]]
  // > "You passively scan a small Rock station that is next to the beacon. However they must not have appreciated your curiosity. A Rock ship pulls away from the station and you register an incoming teleporter signal as well!" — [[Rock fight with boarders]]
  // > "You find a Rock ship docked with a damaged Mantis fighter. Before you have a chance to hail them, the ship moves in to attack you and you register teleporter symbols from the disabled ship. They're using Mantis tech to board you!" — [[Rock fight with boarders]]
  tx("wiki.cited-events.you-passively-scan-a-small-rock"),
  tx("wiki.cited-events.you-find-a-rock-ship-docked"),
];

// Auto-ship fight. Nine printed intros, no odds. INFERRED: equal. The fight stays c:auto-ship-fight:0.
// Auto-ship warning prints the same nine lines. That fight stays c:auto-ship-warning:0.
const AUTO_SHIP_FIGHT_INTROS = [
  tx("wiki.cited-events.you-discover-one-of-the-rebel"),
  tx("wiki.cited-events.your-ship-is-hailed-this-is"),
  tx("wiki.cited-events.a-rebel-autonomous-scout-is-exploring"),
  tx("wiki.cited-events.the-ai-of-a-nearby-small"),
  tx("wiki.cited-events.a-rebel-ship-moves-in-to"),
  tx("wiki.cited-events.this-must-be-one-of-the"),
  tx("wiki.cited-events.another-unmanned-ship-patrols-this-area"),
  tx("wiki.cited-events.this-beacon-is-being-patrolled-by"),
  tx("wiki.cited-events.a-small-shuttle-appears-on-the"),
];

// Rebel fight with boarders. Four printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-with-boarders:0.
const REBEL_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight with boarders]]
  // > "You receive a message from a nearby Rebel station, \"You have a lot of guts passing through our space, I'll give you that.\" He turns giving an order, \"Kill their crew, I want that ship intact.\"" — [[Rebel fight with boarders]]
  // > "Your sensors warn of an incoming Rebel ship at the same time as you hear the telltale signs of a teleporter. You hear someone taunt from within the ship, \"Ready to die? I sure am ready to get a promotion!\"" — [[Rebel fight with boarders]]
  // > "Incoming message, \"Hello Captain,\" says a Rebel in an officer's garb. \"How very generous of you to turn yourself in. Prepare to be boarded. Come quietly and we may be lenient.\"" — [[Rebel fight with boarders]]
  // > "You receive a message on a low-band channel. \"You're surrounded, just like the last of your Federation friends. Just die already.\" The enemy has teleported onto your ship!" — [[Rebel fight with boarders]]
  tx("wiki.cited-events.you-receive-a-message-from-a-2"),
  tx("wiki.cited-events.your-sensors-warn-of-an-incoming"),
  tx("wiki.cited-events.incoming-message-hello-captain-says-a"),
  tx("wiki.cited-events.you-receive-a-message-on-a"),
];

// Boarders: Mantis. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-mantis:0.
const MANTIS_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Mantis]]
  // > "A derelict and still smoking Mantis vessel floats by. The battle must have been recent; its surviving crew beam aboard. Prepare for a fight!" — [[Boarders: Mantis]]
  // > "Your world, all of a sudden, changes. The Mantis are on board your ship." — [[Boarders: Mantis]]
  // > "You hear a grating rattle and a soft clicking. You reach for your pistol." — [[Boarders: Mantis]]
  tx("wiki.cited-events.a-derelict-and-still-smoking-mantis"),
  tx("wiki.cited-events.your-world-all-of-a-sudden"),
  tx("wiki.cited-events.you-hear-a-grating-rattle-and"),
];

// Boarders: Humans in nebula. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-humans-in-nebula:0.
const NEBULA_HUMAN_BOARDER_INTROS = [
  tx("wiki.cited-events.you-see-a-small-station-nearby"),
  tx("wiki.cited-events.you-arrive-in-the-nebula-and"),
  tx("wiki.cited-events.you-see-a-number-of-derelict"),
];

// Boarders: Crystal. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-crystal:0.
const CRYSTAL_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Crystal]]
  // > "You detect a heavily armed Crystalline ship escorting some sort of prison vessel. Scans indicate there are a number of non-Crystal based life forms aboard; they must be rounding up all of the intruders in their space! Before you can react, you hear the telltale sounds of a teleporter going off." — [[Boarders: Crystal]]
  // > "You arrive near a small settlement and a lone guard ship moves to intercept you. You try to contact them but they are refusing all hails. Suddenly you hear lasers ricocheting from within the ship. You've been boarded!" — [[Boarders: Crystal]]
  // > "You pick up chatter from a nearby ship, \"Yes... Here are some interesting specimens. Try to take them alive this time, there's a lot of money to be had on aliens.\" Scanners indicate a remote teleporter was just used." — [[Boarders: Crystal]]
  tx("wiki.cited-events.you-detect-a-heavily-armed-crystalline"),
  tx("wiki.cited-events.you-arrive-near-a-small-settlement"),
  tx("wiki.cited-events.you-pick-up-chatter-from-a"),
];

// Boarders: Rockmen near sun. The page prints two intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-rockmen-near-sun:0.
const ROCK_SUN_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Rockmen near sun]]
  // > "As soon as you arrive you hear the telltale sounds of a teleporter and shouts reverberating through the ship, \"Prepare to burn, fleshy meat-sack aliens!\"" — [[Boarders: Rockmen near sun]]
  // > "With their high resistance to heat, outlaw Rocks often settle very close to stars. That is why it is hardly surprising when your ship gets boarded as you stumble past a hidden settlement." — [[Boarders: Rockmen near sun]]
  tx("wiki.cited-events.as-soon-as-you-arrive-you"),
  tx("wiki.cited-events.with-their-high-resistance-to-heat"),
];

// Boarders: Humans (Pirate). The page prints five intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-humans-pirate:0.
const PIRATE_HUMAN_BOARDER_INTROS = [
  tx("wiki.cited-events.what-appears-to-be-a-civilian"),
  tx("wiki.cited-events.a-heavily-damaged-ship-is-drifting"),
  tx("wiki.cited-events.you-detect-life-signs-actually-on"),
  tx("wiki.cited-events.your-ship-detects-a-faint-distress"),
  tx("wiki.cited-events.as-you-arrive-you-become-aware"),
];

// Rock fight with boarders in asteroid field. Two printed intros, no odds. INFERRED: equal.
// The fight stays c:rock-fight-with-boarders-in-asteroid-field:0, which already beams 1-2 Rock boarders inside an asteroid field.
const ROCK_BOARDER_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders in asteroid field]]
  // > "You arrive in an asteroid field and immediately begin evasive maneuvers when a loud clunk reverberates through the ship. At first you think the hull has been hit, but the noise came from some Rock intruders teleporting aboard the ship!" — [[Rock fight with boarders in asteroid field]]
  // > "''Your shields are being taxed as they deflect the debris from an asteroid field. As you weave your way between the rocks, you happen upon a Rock pirate stronghold. You register teleport signatures and hear shouts aboard the ship.'" — [[Rock fight with boarders in asteroid field]]
  tx("wiki.cited-events.you-arrive-in-an-asteroid-field"),
  tx("wiki.cited-events.your-shields-are-being-taxed-as"),
];

// Lanius fight. Eleven printed intros, one repeated, no odds. INFERRED: equal, so the repeated line is twice as likely.
// The fight stays c:lanius-fight:0. Default Lanius rewards are not a separate payout.
const LANIUS_FIGHT_INTROS = [
  tx("wiki.cited-events.you-receive-a-message-on-a-2"),
  tx("wiki.cited-events.sensors-indicate-a-small-lanius-cruiser"),
  tx("wiki.cited-events.shortly-after-your-arrival-a-lanius"),
  tx("wiki.cited-events.a-military-lanius-vessel-stops-repurposing"),
  tx("wiki.cited-events.the-beacon-is-surrounded-by-many"),
  tx("wiki.cited-events.you-arrive-to-see-a-well"),
  tx("wiki.cited-events.as-you-arrive-in-the-system-2"),
  tx("wiki.cited-events.as-you-are-getting-your-bearings"),
  tx("wiki.cited-events.at-first-everything-seems-quiet-then"),
  tx("wiki.cited-events.you-have-stumbled-across-a-mining"),
  tx("wiki.cited-events.as-you-are-getting-your-bearings"),
];

// Mantis fight (Engi). Four printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-engi:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_ENGI_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Mantis fight (Engi)]]
  // > "A mixed radar signal turns out to be a Mantis attack ship scavenging the remains of an Engi carrier. They turn and fight." — [[Mantis fight (Engi)]]
  // > "You come across a Mantis raider taking pot shots at a defenceless Engi supply station. Discovering its weapons aren't much of a match for the station's armour, it turns on your ship. Battle stations!" — [[Mantis fight (Engi)]]
  // > "The area looks clear, and you prepare to jump off, but a Mantis scout jumps in behind you! They're as surprised as you are, but their weapons are already online." — [[Mantis fight (Engi)]]
  // > "You find a Mantis ship harrying a small squad of Engi. They make it to the node and jump off, leaving you toe to toe with their pursuer!" — [[Mantis fight (Engi)]]
  tx("wiki.cited-events.a-mixed-radar-signal-turns-out"),
  tx("wiki.cited-events.you-come-across-a-mantis-raider"),
  tx("wiki.cited-events.the-area-looks-clear-and-you"),
  tx("wiki.cited-events.you-find-a-mantis-ship-harrying"),
];

// Mantis fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-in-nebula:0. Default Mantis rewards are not a separate payout.
// The storm words are the printed lines. They do not arm an ion storm.
const MANTIS_NEBULA_INTROS = [
  tx("wiki.cited-events.nebulas-are-known-to-be-popular"),
  tx("wiki.cited-events.you-detect-a-mantis-expedition-vessel"),
  tx("wiki.cited-events.a-mantis-ship-lost-in-the"),
  tx("wiki.cited-events.a-mantis-ship-hails-you-through"),
  tx("wiki.cited-events.you-notice-a-mantis-attack-ship"),
];

// Mantis fight. Twenty printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_INTROS = [
  tx("wiki.cited-events.a-mantis-military-ship-appears-on"),
  tx("wiki.cited-events.a-mantis-military-scout-hails-your"),
  tx("wiki.cited-events.a-small-mantis-cruiser-is-broadcasting"),
  tx("wiki.cited-events.you-detect-a-small-military-outpost"),
  tx("wiki.cited-events.you-discover-yet-another-unlicensed-and"),
  tx("wiki.cited-events.a-mantis-military-scout-seems-to"),
  tx("wiki.cited-events.a-small-military-craft-hails-you"),
  tx("wiki.cited-events.a-nearby-mantis-ship-begins-aggressive"),
  tx("wiki.cited-events.a-stream-of-clicks-and-gurgling"),
  tx("wiki.cited-events.the-mantis-ship-is-pleased-to"),
  tx("wiki.cited-events.you-recognize-the-outline-of-a"),
  tx("wiki.cited-events.something-red-looms-it-s-the"),
  tx("wiki.cited-events.a-mantis-vessel-hails-you-this"),
  tx("wiki.cited-events.you-notice-a-flurry-of-laser"),
  tx("wiki.cited-events.the-mantis-hail-you-their-captain"),
  tx("wiki.cited-events.a-mantis-female-comes-on-the"),
  tx("wiki.cited-events.a-mantis-ship-with-the-markings"),
  tx("wiki.cited-events.a-mantis-ship-hails-ah-fine"),
  tx("wiki.cited-events.children-on-earth-are-told-terrible"),
  tx("wiki.cited-events.a-youthful-looking-mantis-captain-hails"),
];

// Mantis fight choice. Six printed intros, no odds. INFERRED: equal.
// Attack stays c:mantis-fight-choice:0. Conceal and cloaking are quests.ts.
const MANTIS_CHOICE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Mantis fight choice]]
  // > "You're greeted by a rare sight: a Mantis ship that appears not to have noticed you." — [[Mantis fight choice]]
  // > "For once, you see the Mantis before they see you." — [[Mantis fight choice]]
  // > "When they see the Mantis warship waiting in ambush at your intended coordinates, your crew is relieved to note you've jumped someway off the mark." — [[Mantis fight choice]]
  // > "You overhear Mantis comm chatter: \"Negative, I have killed more humans!\" You gulp noticeably, but luckily they don't see you yet." — [[Mantis fight choice]]
  // > "You overhear Mantis comm chatter: \"The one on the right is starting to rot. Take him down. Take off his fingers. Put him out of the airlock.\" They certainly don't seem to be friendly..." — [[Mantis fight choice]]
  // > "You overhear Mantis comm chatter: \"Agreed. Next ship is your turn. Good hunting.\" They don't see you yet." — [[Mantis fight choice]]
  tx("wiki.cited-events.you-re-greeted-by-a-rare"),
  tx("wiki.cited-events.for-once-you-see-the-mantis"),
  tx("wiki.cited-events.when-they-see-the-mantis-warship"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-negative"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-the"),
  tx("wiki.cited-events.you-overhear-mantis-comm-chatter-agreed"),
];

// Mantis ship attacking civilian. Five printed intros, no odds. INFERRED: equal.
// Aid stays c:mantis-ship-attacking-civilian:0. Stay out stays :1. The three stay-out sentences are quests.ts.
const MANTIS_CIVILIAN_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Mantis ship attacking civilian]]
  // > "You spot a Mantis ship hunting in the distance." — [[Mantis ship attacking civilian]]
  // > "A Mantis ship engaging a civilian hails you. Sparks fly about his cockpit as he yells, \"Stay out of this human! Else you are next!\"" — [[Mantis ship attacking civilian]]
  // > "Local sensors pick up two ships engaged in a heated battle. It seems the Mantis military ship will surely defeat its prey." — [[Mantis ship attacking civilian]]
  // > "A Mantis vessel flashes past your view-screen, weapons and engines at full. A tiny blip on the sensor readout marks its quarry." — [[Mantis ship attacking civilian]]
  // > "You pick up a distress call from a civilian ship. It's being chased by a Mantis ship!" — [[Mantis ship attacking civilian]]
  tx("wiki.cited-events.you-spot-a-mantis-ship-hunting"),
  tx("wiki.cited-events.a-mantis-ship-engaging-a-civilian"),
  tx("wiki.cited-events.local-sensors-pick-up-two-ships"),
  tx("wiki.cited-events.a-mantis-vessel-flashes-past-your"),
  tx("wiki.cited-events.you-pick-up-a-distress-call"),
];

// Pirate ship attacking civilian. Six printed intros, no odds. INFERRED: equal.
// Aid stays c:pirate-ship-attacking-civilian:0. Stay out stays :1. The stay-out sentence is quests.ts.
const PIRATE_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-arrive-in-the-system-to"),
  tx("wiki.cited-events.scanners-indicate-that-a-battle-is"),
  tx("wiki.cited-events.you-detect-two-ships-one-chasing"),
  tx("wiki.cited-events.there-are-only-two-ships-within"),
  tx("wiki.cited-events.you-arrive-at-the-next-beacon"),
  tx("wiki.cited-events.you-come-out-of-the-jump"),
];

// Pirate ship attacking civilian (Lanius). Three printed intros, no odds. INFERRED: equal.
// Attack stays c:pirate-ship-attacking-civilian-lanius:0. Avoid stays :1.
const LANIUS_PIRATE_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-discover-an-abandoned-mining-facility"),
  tx("wiki.cited-events.a-pirate-ship-emerges-from-hiding"),
  tx("wiki.cited-events.a-pirate-ship-is-firing-on"),
];

// Pirate fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:pirate-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight in nebula]]
  // > "As you drift through the nebula an unmarked vessel descends from the clouds and into your wake. Their weapons come online." — [[Pirate fight in nebula]]
  // > "A pirate ship pulls out of the ether and hails: \"You know what I love about this part of the galaxy? The explorers! You always carry such fine loot.\" They lock weapons." — [[Pirate fight in nebula]]
  // > "As you coast through the nebula a pirate ship matches your course and closes the distance. Better to pick your battleground, but beggars can't be choosers." — [[Pirate fight in nebula]]
  // > "A hostile vessel descends from out of the nebula. Combat stations!" — [[Pirate fight in nebula]]
  // > "You try to read the ID of a ship ahead in the fog, but it's too thick to penetrate. You have your answer when the ship turns, weapons hot!" — [[Pirate fight in nebula]]
  tx("wiki.cited-events.as-you-drift-through-the-nebula"),
  tx("wiki.cited-events.a-pirate-ship-pulls-out-of"),
  tx("wiki.cited-events.as-you-coast-through-the-nebula"),
  tx("wiki.cited-events.a-hostile-vessel-descends-from-out"),
  tx("wiki.cited-events.you-try-to-read-the-id"),
];

// Rebel fight in nebula. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_REBEL_INTROS = [
  tx("wiki.cited-events.you-cross-paths-with-an-advance"),
  tx("wiki.cited-events.a-ship-bearing-rebel-colors-can"),
  tx("wiki.cited-events.the-rebels-must-have-anticipated-you"),
  tx("wiki.cited-events.it-looks-like-you-will-be"),
  tx("wiki.cited-events.shortly-after-you-arrive-a-rebel"),
  tx("wiki.cited-events.newton-knows-what-brings-this-rebel"),
  tx("wiki.cited-events.a-rebel-ship-hails-but-you"),
];

// Auto-ship fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:auto-ship-fight-in-nebula:0. The destroyed reward is quests.ts. No nebula environment is added.
const NEBULA_AUTO_INTROS = [
  tx("wiki.cited-events.you-cross-paths-with-an-advance"),
  tx("wiki.cited-events.you-jump-into-a-calmer-part"),
  tx("wiki.cited-events.the-tangled-wrecks-of-many-ships"),
  tx("wiki.cited-events.this-drone-isn-t-looking-for"),
  tx("wiki.cited-events.it-s-worrying-that-the-rebels"),
];

// Zoltan fight. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:zoltan-fight:0. Default rewards. No extra payout is added here.
const ZOLTAN_FIGHT_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Zoltan fight]]
  // > "A Zoltan ship makes contact. \"The nature of the day is rotational. The fever is emaciated. The reason is-\" They've caught some nasty deep space dementia. Before you can consider finding help for them, they open fire." — [[Zoltan fight]]
  // > "You're surprised when a stationary Zoltan ship opens fire. It appears there are aggressive pugilists even among the 'enlightened'." — [[Zoltan fight]]
  // > "You receive a message, \"This area is off limits. Submit your ship to processing.\" It's only one guard ship in a lonely beacon. You decide to fight your way out." — [[Zoltan fight]]
  // > "You discover a number of Zoltan civilian ships fighting off pirates. Unfortunately one ship mistakes your purpose and moves in to attack! They are refusing all communication; you have no choice but to fight." — [[Zoltan fight]]
  // > "Like many areas in Zoltan space, the residents of this sector prepared well for Galactic war. The military here seem to have given up reasoning with foreigners, preferring instead to attack on sight!" — [[Zoltan fight]]
  // > "A Zoltan ship is waiting at this beacon. They request your identification, but radiation from the sun in this system is disrupting your communications. They take your silence for aggression and move in to attack." — [[Zoltan fight]]
  // > "The Zoltan ship patrolling this area hails you: \"This area is off limits. Secrecy is vital.\" They power their weapons." — [[Zoltan fight]]
  tx("wiki.cited-events.a-zoltan-ship-makes-contact-the"),
  tx("wiki.cited-events.you-re-surprised-when-a-stationary"),
  tx("wiki.cited-events.you-receive-a-message-this-area"),
  tx("wiki.cited-events.you-discover-a-number-of-zoltan"),
  tx("wiki.cited-events.like-many-areas-in-zoltan-space"),
  tx("wiki.cited-events.a-zoltan-ship-is-waiting-at"),
  tx("wiki.cited-events.the-zoltan-ship-patrolling-this-area"),
];

// Crystal fight. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:crystal-fight:0. The unique surrender is surrender.ts.
const CRYSTAL_FIGHT_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Crystal fight]]
  // > "You arrive near a fleet of crystal ships, civilian or mercantile from the looks of them. You pause to scan one but they react immediately and send an escort to fight you off. Prepare to engage!" — [[Crystal fight]]
  // > "You arrive at the Beacon and are immediately greeted by an automatic message or warning of some kind. The translator can't seem to discern its purpose but after a few short moments an alarm goes off and a hostile ship jumps in!" — [[Crystal fight]]
  // > "You receive a message, \"Hah. It looks like another worthless alien-filled craft. Prepare to meet your maker!\" Weapon locks detected." — [[Crystal fight]]
  // > "A Crystalline ship messages you, \"I've heard tales that our isolation has finally ended. As a warrior I must demand to test my skills against you!\" Before you can respond they move in to attack." — [[Crystal fight]]
  // > "You arrive in a busy sector. At first no one pays any mind to your alien ship but soon you're registering a number of scan signatures. You get the feeling you're not wanted here just seconds before registering enemy weapon locks!" — [[Crystal fight]]
  // > "You jump next to a node busy with traffic, but before long all nearby ships notice you and keep their distance, uncertain of your allegiance. After an awkward standoff, a military ship breaks away from the rest and charges you." — [[Crystal fight]]
  // > "A barrage of rasps and clicks is broadcast over the comm; the universal translator understands little, but the words 'aliens', 'allowed' and 'no' come through quite clearly. You'll have to prove your right to be here in combat!" — [[Crystal fight]]
  tx("wiki.cited-events.you-arrive-near-a-fleet-of"),
  tx("wiki.cited-events.you-arrive-at-the-beacon-and-3"),
  tx("wiki.cited-events.you-receive-a-message-hah-it"),
  tx("wiki.cited-events.a-crystalline-ship-messages-you-i"),
  tx("wiki.cited-events.you-arrive-in-a-busy-sector"),
  tx("wiki.cited-events.you-jump-next-to-a-node"),
  tx("wiki.cited-events.a-barrage-of-rasps-and-clicks"),
];

// Rebel fight among Rebel fleet. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-rebel-fleet:0. The low scrap and medium scrap payouts are not added here.
const REBEL_FLEET_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight among Rebel fleet]]
  // > "Although you were expecting the Rebels, you never imagined their fleet could have grown so fast. Your scanners can hardly register them all before a fighter stationed nearby moves in to attack." — [[Rebel fight among Rebel fleet]]
  // > "This system is flooded with Rebel warships. Luckily your ship's signature is disguised as a civilian transport. Most heavy vessels ignore you but a small fighter is approaching with weapons hot!" — [[Rebel fight among Rebel fleet]]
  // > "You arrive to find a Rebel battalion encircling a nearby planet, launching landing parties. A small scout moves toward your position. Prepare for a fight!" — [[Rebel fight among Rebel fleet]]
  // > "As soon as you arrive you find yourself in the debris of a fierce battle. However, only Rebel warships remain and you find yourself immediately under attack." — [[Rebel fight among Rebel fleet]]
  // > "Shots fly by and your computer registers multiple weapon locks as soon as you arrive. Evasive action!" — [[Rebel fight among Rebel fleet]]
  // > "What was once a great series of space stations is now nothing but a small ring of debris around the nearby moon. There's no time to mourn the dead; an enemy approaches!" — [[Rebel fight among Rebel fleet]]
  // > "The Federation seems to have put up a good fight. A number of Rebel ships lie broken or wounded. However their overwhelming numbers force the remaining Federation forces to retreat. Hopefully you can get away in time as well." — [[Rebel fight among Rebel fleet]]
  tx("wiki.cited-events.although-you-were-expecting-the-rebels"),
  tx("wiki.cited-events.this-system-is-flooded-with-rebel"),
  tx("wiki.cited-events.you-arrive-to-find-a-rebel"),
  tx("wiki.cited-events.as-soon-as-you-arrive-you-2"),
  tx("wiki.cited-events.shots-fly-by-and-your-computer"),
  tx("wiki.cited-events.what-was-once-a-great-series"),
  tx("wiki.cited-events.the-federation-seems-to-have-put"),
];

// Rebel fight among Federation and Rebel fleets. Six printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-federation-and-rebel-fleets:0. Escape and the scrap payouts stay elsewhere.
const FEDERATION_FLEET_INTROS = [
  tx("wiki.cited-events.you-arrive-in-the-middle-of-3"),
  tx("wiki.cited-events.two-fleets-fight-nearby-you-try"),
  tx("wiki.cited-events.it-s-hard-to-tell-who"),
  tx("wiki.cited-events.the-sheer-scale-of-the-destruction"),
  tx("wiki.cited-events.the-destruction-in-the-distance-is"),
  tx("wiki.cited-events.you-don-t-have-any-time"),
];

// Lanius ship attacking civilian. Three printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-attacking-civilian:0. Avoid stays the nothing choice.
const LANIUS_CIVILIAN_INTROS = [
  tx("wiki.cited-events.you-immediately-receive-a-message-upon"),
  tx("wiki.cited-events.you-scan-the-area-after-arriving"),
  tx("wiki.cited-events.you-arrive-at-the-location-of"),
];

// Lanius ship salvager. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-salvager:0. Leave stays :1. The Lanius scrap request stays :2.
const LANIUS_SALVAGER_INTROS = [
  tx("wiki.cited-events.you-come-across-a-single-lanius"),
  tx("wiki.cited-events.there-are-remnants-of-a-fierce"),
  tx("wiki.cited-events.when-you-arrive-at-the-beacon"),
  tx("wiki.cited-events.a-small-asteroid-belt-is-near"),
  tx("wiki.cited-events.a-lanius-ship-is-slowly-salvaging"),
];

// The mercenary. Six printed intros, no odds. INFERRED: equal.
// Delay stays c:the-mercenary:0. Fight stays :1. Decline stays :2.
const MERCENARY_INTROS = [
  tx("wiki.cited-events.you-find-a-mercenary-for-hire"),
  tx("wiki.cited-events.a-mercenary-hails-you-greetings-friend"),
  tx("wiki.cited-events.there-s-a-ship-with-pirate"),
  tx("wiki.cited-events.the-captain-of-this-ship-claims"),
  tx("wiki.cited-events.mercenaries-are-swarming-the-galaxy-now"),
  tx("wiki.cited-events.a-ship-hails-you-good-sir"),
];

// Rebel ship supplying civilians. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:rebel-ship-supplying-civilians:0. Leave stays :1. Wait and steal stays :2.
const REBEL_SUPPLY_INTROS = [
  tx("wiki.cited-events.you-stumble-across-a-rebel-ship"),
  tx("wiki.cited-events.you-find-a-rebel-combat-ship"),
  tx("wiki.cited-events.the-rebels-in-this-system-are"),
  tx("wiki.cited-events.civilian-colonists-loyal-to-the-rebel"),
  tx("wiki.cited-events.because-of-the-war-thousands-of"),
];

// Rebel ship attacking Federation loyalists. Three printed intros, no odds. INFERRED: equal.
// Aid stays c:rebel-ship-attacking-federation-loyalists:0. Escape stays :1.
const REBEL_LOYALIST_INTROS = [
  tx("wiki.cited-events.upon-arriving-at-this-beacon-you"),
  tx("wiki.cited-events.you-immediately-notice-a-rebel-ship"),
  tx("wiki.cited-events.your-sensors-are-picking-up-a"),
];

// Pirate briber. Three printed intros, no odds. INFERRED: equal.
// Accept stays c:pirate-briber:0. Attack stays c:pirate-briber:1.
const PIRATE_BRIBER_INTROS = [
  tx("wiki.cited-events.you-come-across-a-pirate-in"),
  tx("wiki.cited-events.an-unidentified-ship-is-badly-damaged"),
  tx("wiki.cited-events.a-missile-shoots-across-your-bow"),
];

// Slug fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:slug-fight-in-nebula:0. No nebula environment is added. Surrender stays the Slug row.
const NEBULA_SLUG_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in nebula]]
  // > "Your sensors are no match for the Slug's telepathic abilities - a ship you never even saw opens fire from astern!" — [[Slug fight in nebula]]
  // > "The Slug vessel you encounter here has obviously made a big score and is looking to test its new armaments. They picked the wrong ship to attack." — [[Slug fight in nebula]]
  // > "A Slug passenger ship hails: \"Please, your worthy alien highnessesss, we are unarmed and sseeking asssylum.\" You approach cautiously, and weapons immediately spring from their hull!" — [[Slug fight in nebula]]
  // > "A Slug ship - a rogue, you suspect - approaches, but when he sees you're Federation he thinks better of the sneak attack and fires everything he has." — [[Slug fight in nebula]]
  // > "Direct attacks are not preferred by the Slugs, but of the three you see at this beacon, one has the brass to make a move on your position!" — [[Slug fight in nebula]]
  tx("wiki.cited-events.your-sensors-are-no-match-for"),
  tx("wiki.cited-events.the-slug-vessel-you-encounter-here"),
  tx("wiki.cited-events.a-slug-passenger-ship-hails-please"),
  tx("wiki.cited-events.a-slug-ship-a-rogue-you"),
  tx("wiki.cited-events.direct-attacks-are-not-preferred-by"),
];

// Escort civilians. Three printed intros, no odds. INFERRED: equal.
// Accept stays the low fuel and the quest marker. Decline stays nothing.
const ESCORT_CIVILIAN_INTROS = [
  tx("wiki.cited-events.after-a-short-time-you-receive"),
  tx("wiki.cited-events.there-is-a-single-ship-at"),
  tx("wiki.cited-events.hello-your-communicator-opens-a-hail"),
];

// Trade fuel for drone parts. Three printed intros, no odds. INFERRED: equal.
// The trade stays lose 2-4 fuel for 1-3 drone parts. Reject stays nothing.
const FUEL_FOR_DRONES_INTROS = [
  tx("wiki.cited-events.a-nearby-space-station-hails-you"),
  tx("wiki.cited-events.a-strange-vessel-approaches-a-digital"),
  tx("wiki.cited-events.you-arrive-in-the-sector-and"),
];

// Rock pirates fight near sun. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-near-sun:0.
const ROCK_PIRATE_SUN_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight near sun]]
  // > "Unusual solar activity in this region means you need to get out, quick. The Rock pirate nearby apparently thinks otherwise as they move to attack your ship." — [[Rock pirates fight near sun]]
  // > "A Rock ship is silhouetted against a sun in supernova. They hail: \"Even out here you follow us! We only wish to be left alone!\" Out of panic or anger, they charge their weapons." — [[Rock pirates fight near sun]]
  tx("wiki.cited-events.unusual-solar-activity-in-this-region"),
  tx("wiki.cited-events.a-rock-ship-is-silhouetted-against"),
];

// Rock pirates fight in asteroid field. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-in-asteroid-field:0.
const ROCK_PIRATE_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight in asteroid field]]
  // > "Minute fissures in the shields spark and crackle as the ship jumps into the wake of a huge asteroid. More asteroids follow, as does a lost and aggressive Rock pirate ship." — [[Rock pirates fight in asteroid field]]
  // > "You exit the jump surrounded by dirt and rocks. Before long a blast is deflected by your shield, but that was no asteroid... Incoming pirate!" — [[Rock pirates fight in asteroid field]]
  tx("wiki.cited-events.minute-fissures-in-the-shields-spark"),
  tx("wiki.cited-events.you-exit-the-jump-surrounded-by"),
];

// Rock fight in asteroid field. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-in-asteroid-field:0.
const ROCK_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight in asteroid field]]
  // > "A Rock mining vessel is harvesting the mineral-rich asteroids in this locality, and their scouts take your presence to be a transgression. Battle stations!" — [[Rock fight in asteroid field]]
  // > "A rookie Rock cargo ship has taken its orders too literally and took the most direct route to their destination... right through an asteroid field. They're confused and fire wildly as you jump in." — [[Rock fight in asteroid field]]
  // > "The captain of a Rock freighter lost in the asteroid field hails you: \"Our co-ordinates led us here, but only death greets us. What must be must be. Death to all.\" You power up the battle systems and wonder how long they've been stuck here." — [[Rock fight in asteroid field]]
  tx("wiki.cited-events.a-rock-mining-vessel-is-harvesting"),
  tx("wiki.cited-events.a-rookie-rock-cargo-ship-has"),
  tx("wiki.cited-events.the-captain-of-a-rock-freighter"),
];

// Rebel fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-slug:0.
const SLUG_REBEL_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight (Slug)]]
  // > "As you arrive at the beacon, a hostile ship immediately registers on your scanners. You didn't expect to see Rebels extending their reach into Slug territory. Charge the weapons!" — [[Rebel fight (Slug)]]
  // > "You jump into empty space and are relieved to see your sensors blink back to life. However, you are less pleased to see them immediately register a rebel ship on an approach vector!" — [[Rebel fight (Slug)]]
  // > "You receive a message from a nearby ship, \"Looks like our intelligence was correct! Sneaking through the clouds with the Slugs... No one can hide from the rebellion!\"" — [[Rebel fight (Slug)]]
  tx("wiki.cited-events.as-you-arrive-at-the-beacon"),
  tx("wiki.cited-events.you-jump-into-empty-space-and"),
  tx("wiki.cited-events.you-receive-a-message-from-a-3"),
];

// Pirate fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-slug:0.
const SLUG_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Slug)]]
  // > "There appears to be a pirate ship nearby. Be on your guard; anyone trying to hunt in Slug territory is either formidable or deeply stupid, and in space, either can be dangerous." — [[Pirate fight (Slug)]]
  // > "\"We knew anyone foolish enough to try and sneak through a Slug nebula would stick to open space. Yield your goods and we may let you live.\" You cut the transmission in lieu of a response." — [[Pirate fight (Slug)]]
  // > "Before you can take a moment's rest from the ever present nebulas in this sector, a pirate ship appears behind you and opens fire." — [[Pirate fight (Slug)]]
  tx("wiki.cited-events.there-appears-to-be-a-pirate"),
  tx("wiki.cited-events.we-knew-anyone-foolish-enough-to"),
  tx("wiki.cited-events.before-you-can-take-a-moment"),
];

// Pirate fight (Lanius). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-lanius:0.
const LANIUS_PIRATE_INTROS = [
  tx("wiki.cited-events.an-upgraded-pirate-ship-sits-among"),
  tx("wiki.cited-events.the-pirate-ship-patrolling-this-sector"),
  tx("wiki.cited-events.a-pirate-ship-appears-to-be"),
  tx("wiki.cited-events.debris-from-a-number-of-battleships"),
  tx("wiki.cited-events.the-pirate-sees-you-before-you"),
];

// Pirate fight (Zoltan). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-zoltan:0.
const ZOLTAN_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Zoltan)]]
  // > "\"Emergency, all ships in range, we are under attack!\" The frequency matches a nearby Zoltan ship; you move in on their pursuer. They take your intervention as a cue to jump away. Cowards." — [[Pirate fight (Zoltan)]]
  // > "You jump just in time to witness a Zoltan ship's FTL drive overload. In their final moments they implore you not to get involved, but it's too late - their attacker is already upon you!" — [[Pirate fight (Zoltan)]]
  // > "Despite their precautions, pirates have begun to harass the local Zoltan settlements across this sector. One such pirate spots your ship and moves in to attack." — [[Pirate fight (Zoltan)]]
  // > "A ship with pirate markings demand that you surrender. These are sad times when even Zoltan space is beset by pirates. You doubt these fools will be missed." — [[Pirate fight (Zoltan)]]
  // > "You spot a pirate ship looting a small Zoltan cruiser. They spot you and move in to attack before your FTL drive has a chance to recharge." — [[Pirate fight (Zoltan)]]
  tx("wiki.cited-events.emergency-all-ships-in-range-we"),
  tx("wiki.cited-events.you-jump-just-in-time-to"),
  tx("wiki.cited-events.despite-their-precautions-pirates-have-begun"),
  tx("wiki.cited-events.a-ship-with-pirate-markings-demand"),
  tx("wiki.cited-events.you-spot-a-pirate-ship-looting"),
];

// Rock pirates fight. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight:0.
const ROCK_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight]]
  // > "As a naturally warlike species with few inter-galactic diplomatic ties, the Rock people have garnered quite a reputation as fearsome pirates. You stumble across one of their ships and they promptly live up to type." — [[Rock pirates fight]]
  // > "A Rock ship flies past your windows and you recognize outcast decorations on the hull. These must be pirates!" — [[Rock pirates fight]]
  // > "A motley collection of Rock ships are stationed around this beacon - they look to have resorted to a pirate's life. Defensive maneuvers!" — [[Rock pirates fight]]
  tx("wiki.cited-events.as-a-naturally-warlike-species-with"),
  tx("wiki.cited-events.a-rock-ship-flies-past-your"),
  tx("wiki.cited-events.a-motley-collection-of-rock-ships"),
];

// Rebel fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-near-pulsar:0.
const REBEL_PULSAR_INTROS = [
  tx("wiki.cited-events.a-rebel-captain-appears-on-the"),
  tx("wiki.cited-events.a-small-rebel-research-station-overlooks"),
  tx("wiki.cited-events.you-arrive-at-an-infrequently-used"),
];

// Rebel fight. Ten printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight:0.
const REBEL_FIGHT_INTROS = [
  tx("wiki.cited-events.your-ship-is-hailed-we-ve"),
  tx("wiki.cited-events.a-small-rebel-ship-is-docked"),
  tx("wiki.cited-events.a-rebel-ship-has-been-patrolling"),
  tx("wiki.cited-events.a-rebel-ship-hails-you-federation"),
  tx("wiki.cited-events.you-receive-a-transmission-sorry-sir"),
  tx("wiki.cited-events.by-the-time-you-notice-the"),
  tx("wiki.cited-events.a-rebel-ship-hails-we-did"),
  tx("wiki.cited-events.a-rebel-ship-approaches-cautiously-personally"),
  tx("wiki.cited-events.you-re-hailed-by-a-rebel"),
  tx("wiki.cited-events.a-rebel-ship-is-guarding-this"),
];

// Rebel ship attacking civilians in Last Stand. Five printed intros, no odds. INFERRED: equal. Both choices stay.
const LAST_STAND_CIVILIAN_INTROS = [
  tx("wiki.cited-events.a-number-of-large-transports-are"),
  tx("wiki.cited-events.shots-fly-by-your-port-windows"),
  tx("wiki.cited-events.there-seems-to-be-a-small"),
  tx("wiki.cited-events.a-battle-rages-nearby-between-small"),
  tx("wiki.cited-events.a-civilian-ship-is-broadcasting-a"),
];

/**
 * Trade scrap for upgrades. The intro "can be any of the following".
 * INFERRED: the four printed texts are equally likely.
 */
const TRADE_INTROS = [
  tx("wiki.filler-events.you-pick-up-an-automated-message"),
  tx("wiki.filler-events.there-are-a-number-of-privately"),
  tx("wiki.filler-events.you-receive-a-message-from-a-2"),
  tx("wiki.filler-events.you-are-immediately-hailed-by-a"),
];

/**
 * Crew hiring station. "The intro text for this event varies, and could be any of the following".
 * Three texts and no odds. INFERRED: equal.
 * The hire prices grant an unnamed crewmember and stay off this card.
 */
const HIRE_INTROS = [
  tx("wiki.filler-events.this-beacon-seems-to-serve-as"),
  tx("wiki.filler-events.you-find-a-space-station-set"),
  tx("wiki.filler-events.there-are-a-number-of-ships"),
];

const SUPPLY_INTROS = [
  tx("wiki.filler-events.you-look-like-a-military-vessel"),
  tx("wiki.filler-events.you-receive-a-message-from-a"),
];

// Abandoned station. The page prints three opening intros and no odds.
// INFERRED: equal. Examine and stay stay the existing choices.
const ABANDONED_STATION_INTROS = [
  tx("wiki.filler-events.you-arrive-to-find-what-appears"),
  tx("wiki.filler-events.you-find-a-small-space-station"),
  tx("wiki.filler-events.this-area-shows-signs-of-a"),
];

// Rebel fight chance. The page prints four opening intros and no odds.
// INFERRED: equal. The search, the jump, and the two scans stay the existing choices.
const REBEL_CHANCE_INTROS = [
  tx("wiki.filler-events.you-arrive-at-a-beacon-located"),
  tx("wiki.filler-events.as-soon-as-you-arrive-you"),
  tx("wiki.filler-events.you-begin-charging-your-ftl-drive"),
  tx("wiki.filler-events.you-jump-into-a-field-of"),
];

// Battlefield wreckage. The page prints two opening intros and no odds.
// INFERRED: equal. Investigate, ignore, and the sensors scan stay the existing choices.
const WRECKAGE_INTROS = [
  tx("wiki.filler-events.what-at-first-seems-to-be"),
  tx("wiki.filler-events.you-have-jumped-into-the-aftermath"),
];

const ENGI_GIFT_INTROS = [
  tx("wiki.cited-missing.engi-gift-1"),
  tx("wiki.cited-missing.engi-gift-2"),
  tx("wiki.cited-missing.engi-gift-3"),
  tx("wiki.cited-missing.engi-gift-4"),
];

const LAST_STAND_INTROS = [
  tx("wiki.cited-missing.last-stand-1"),
  tx("wiki.cited-missing.last-stand-2"),
  tx("wiki.cited-missing.last-stand-3"),
  tx("wiki.cited-missing.last-stand-4"),
  tx("wiki.cited-missing.last-stand-5"),
  tx("wiki.cited-missing.last-stand-6"),
];

const TRADER_OFF = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[No fuel: fuel trader (distress off)]]
  // > "A merchant ship jumps into the sector and you quickly hail them asking for help. They respond, \"Perhaps we could work out an exchange...\"" — [[No fuel: fuel trader (distress off)]]
  // > "A number of ships pass through the sector. You relay your message to each, and one finally responds. \"I can't help much right now but perhaps we can trade.\"" — [[No fuel: fuel trader (distress off)]]
  // > "A nearby settlement sends a small ship in your direction. It keeps its distance and hails you, \"We can give you fuel for a price. Just don't even think of doing anything rash. We've got a teleporter at our base and a squad ready to defend us." — [[No fuel: fuel trader (distress off)]]
  // > "A large caravan of merchant ships jumps to a location near your position. Sensing an opportunity, one ship breaks off from the fleet to offer you an exchange." — [[No fuel: fuel trader (distress off)]]
  // > "A modified YT-1300 freighter jumps to an area near your sector. Your gut tells you these people are smugglers, but they seem to be feeling altruistic and present an offer of assistance." — [[No fuel: fuel trader (distress off)]]
  tx("wiki.cited-missing.trader-off-1"),
  tx("wiki.cited-missing.trader-off-2"),
  tx("wiki.cited-missing.trader-off-3"),
  tx("wiki.cited-missing.trader-off-4"),
  tx("wiki.cited-missing.trader-off-5"),
];

const TRADER_ON = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[No fuel: fuel trader (distress on)]]
  // > "A merchant ship jumps into the sector, obviously responding to your ship's distress beacon. They hail you offering a trade for fuel." — [[No fuel: fuel trader (distress on)]]
  // > "A ship arrives at the beacon. \"We noticed your distress signal. I assume you're out of fuel? We're a bit low ourselves but perhaps we can make a trade.\"" — [[No fuel: fuel trader (distress on)]]
  // > "A ship traveling near the beacon approaches your ship and hails you. \"Out of fuel? This is a good opportunity for both of us... Care to trade?\"" — [[No fuel: fuel trader (distress on)]]
  // > "A mercenary ship arrives at the beacon. \"We have a bit of extra fuel we can give you... for a price.\"" — [[No fuel: fuel trader (distress on)]]
  tx("wiki.cited-missing.trader-on-1"),
  tx("wiki.cited-missing.trader-on-2"),
  tx("wiki.cited-missing.trader-on-3"),
  tx("wiki.cited-missing.trader-on-4"),
];

export const OPENING_TEXTS: Record<string, readonly string[]> = {
  "trade-resources": TRADE_RESOURCE_INTROS,
  "lanius-trader": LANIUS_TRADER_INTROS,
  "pirate-fight": PIRATE_FIGHT_INTROS,
  "free-scrap-with-resources": FREE_SCRAP_WITH_RESOURCES_INTROS,
  "pirate-ship-distress-trap": PIRATE_DISTRESS_TRAP_INTROS,
  "slug-fight-in-plasma-storm": SLUG_PLASMA_INTROS,
  "free-weapon": FREE_WEAPON_INTROS,
  "rebel-checkpoint": REBEL_CHECKPOINT_INTROS,
  "pirate-fight-near-pulsar": PIRATE_PULSAR_INTROS,
  "rock-fight": ROCK_FIGHT_INTROS,
  "rebel-fight-lanius": LANIUS_REBEL_INTROS,
  "rock-fight-with-boarders": ROCK_BOARDER_INTROS,
  "auto-ship-fight": AUTO_SHIP_FIGHT_INTROS,
  "auto-ship-warning": AUTO_SHIP_FIGHT_INTROS,
  "rebel-fight-with-boarders": REBEL_BOARDER_INTROS,
  "boarders-mantis": MANTIS_BOARDER_INTROS,
  "boarders-humans-in-nebula": NEBULA_HUMAN_BOARDER_INTROS,
  "boarders-crystal": CRYSTAL_BOARDER_INTROS,
  "boarders-rockmen-near-sun": ROCK_SUN_BOARDER_INTROS,
  "boarders-humans-pirate": PIRATE_HUMAN_BOARDER_INTROS,
  "rock-fight-with-boarders-in-asteroid-field": ROCK_BOARDER_ASTEROID_INTROS,
  "lanius-fight": LANIUS_FIGHT_INTROS,
  "mantis-fight-engi": MANTIS_FIGHT_ENGI_INTROS,
  "mantis-fight-in-nebula": MANTIS_NEBULA_INTROS,
  "mantis-fight": MANTIS_FIGHT_INTROS,
  "mantis-fight-choice": MANTIS_CHOICE_INTROS,
  "mantis-ship-attacking-civilian": MANTIS_CIVILIAN_INTROS,
  "pirate-ship-attacking-civilian": PIRATE_CIVILIAN_INTROS,
  "pirate-ship-attacking-civilian-lanius": LANIUS_PIRATE_CIVILIAN_INTROS,
  "pirate-fight-in-nebula": NEBULA_PIRATE_INTROS,
  "rebel-fight-in-nebula": NEBULA_REBEL_INTROS,
  "auto-ship-fight-in-nebula": NEBULA_AUTO_INTROS,
  "zoltan-fight": ZOLTAN_FIGHT_INTROS,
  "crystal-fight": CRYSTAL_FIGHT_INTROS,
  "rebel-fight-among-rebel-fleet": REBEL_FLEET_INTROS,
  "rebel-fight-among-federation-and-rebel-fleets": FEDERATION_FLEET_INTROS,
  "lanius-ship-attacking-civilian": LANIUS_CIVILIAN_INTROS,
  "lanius-ship-salvager": LANIUS_SALVAGER_INTROS,
  "the-mercenary": MERCENARY_INTROS,
  "rebel-ship-supplying-civilians": REBEL_SUPPLY_INTROS,
  "rebel-ship-attacking-federation-loyalists": REBEL_LOYALIST_INTROS,
  "pirate-briber": PIRATE_BRIBER_INTROS,
  "slug-fight-in-nebula": NEBULA_SLUG_INTROS,
  "escort-civilians": ESCORT_CIVILIAN_INTROS,
  "trade-fuel-for-drone-parts": FUEL_FOR_DRONES_INTROS,
  "rock-pirates-fight-near-sun": ROCK_PIRATE_SUN_INTROS,
  "rock-pirates-fight-in-asteroid-field": ROCK_PIRATE_ASTEROID_INTROS,
  "rock-fight-in-asteroid-field": ROCK_ASTEROID_INTROS,
  "rebel-fight-slug": SLUG_REBEL_INTROS,
  "pirate-fight-slug": SLUG_PIRATE_INTROS,
  "pirate-fight-lanius": LANIUS_PIRATE_INTROS,
  "pirate-fight-zoltan": ZOLTAN_PIRATE_INTROS,
  "rock-pirates-fight": ROCK_PIRATE_INTROS,
  "rebel-fight-near-pulsar": REBEL_PULSAR_INTROS,
  "rebel-fight": REBEL_FIGHT_INTROS,
  "rebel-ship-attacking-civilians-in-last-stand": LAST_STAND_CIVILIAN_INTROS,
  "trade-scrap-for-upgrades": TRADE_INTROS,
  "crew-hiring-station": HIRE_INTROS,
  "improve-reactor-for-supplies": SUPPLY_INTROS,
  "abandoned-station": ABANDONED_STATION_INTROS,
  "rebel-fight-chance": REBEL_CHANCE_INTROS,
  "battlefield-wreckage": WRECKAGE_INTROS,
  "free-scrap-with-resources-engi": ENGI_GIFT_INTROS,
  "fight-in-last-stand": LAST_STAND_INTROS,
  "no-fuel-fuel-trader-distress-off": TRADER_OFF,
  "no-fuel-fuel-trader-distress-on": TRADER_ON,
};
