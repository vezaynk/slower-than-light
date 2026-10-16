/**
 * Opening sentences for a beacon page. The pack stores them on the event.
 * The sim still picks one when the card opens, with the same between or rand draw.
 * A list shared by two pages is one array. Choice handlers stay in the event modules.
 */

const TRADE_RESOURCE_INTROS = [
  'You arrive at a quiet spaceport and are immediately hailed by another ship at port with a "once in a lifetime deal!"',
  "You jump into a sector filled with civilian activity. Your scan the various advertisement channels while waiting for your FTL to charge, and are intrigued by a grey-market shipwright.",
  "Your ship is flooded with advertisement transmissions from nearby merchants as soon as you arrive at this beacon. You arbitrarily pick one to examine in detail.",
  "Despite the barren area, a trader has set up shop at this beacon. He presents his offer.",
  "The beacon at first glance seems home to a junk yard. Upon closer inspection, it reveals itself to be a ramshackle market. One trader has a deal that catches your eye.",
  "A pawn broker has set up shop at this obscure beacon. He might be offering something worth looking at.",
];

// Lanius trader. The page prints three intros and no odds. INFERRED: equal.
const LANIUS_TRADER_INTROS = [
  'Aided by a modified translator, a nearby Lanius scavenger ship messages you, saying, "Metal sufficient. Request exchange." It appears there are some Lanius who wish sociable interaction with other races.',
  "A small Lanius craft approaches. You prepare for a fight but they do not seem to be carrying any weapons. After a brief moment they message you, although your translator struggles with the unfamiliar dialect. It appears they wish to trade.",
  "You arrive to find a large Lanius vessel laden with recently collected metal. They are apparently offering to trade for supplies they are lacking.",
];

// Pirate fight. The page prints five intros and then a default Pirate ship fight, and it prints no odds.
// INFERRED: the five intros are equally likely.
const PIRATE_FIGHT_INTROS = [
  "As you jump into the system a pirate advances on your position. They are refusing all hails. Prepare for a fight.",
  'Soon after arriving in the system you are hailed by a small cruiser. "What good fortune that we happen to run into each other. Nothing personal, but you have some information we need!"',
  'At first it appears you\'ve arrived in an empty system, but a ship appears from behind a planet and hails you: "Haha! I am the dread pirate Tuco, prepare to die!"',
  'The only other ship at this beacon messages you: "Finally, after months of waiting, someone has fallen into our trap!"',
  "You barely have time to register jump completion before your ship warns you of an incoming ship with weapons hot.",
];

// Free scrap with resources. The page prints six intros and no odds.
// INFERRED: equal. The gift stays c:free-scrap-with-resources:0.
const FREE_SCRAP_WITH_RESOURCES_INTROS = [
  "You arrive in a system and immediately discover a pirate ship nearby. Strangely, scans indicate there are no lifeforms aboard. You salvage anything useful, but find no clue as to the whereabouts of the former crew.",
  "Not much remains in this abandoned system; however, scans reveal a nearby mining platform with some salvageable materials.",
  "As you arrive in the system you are hailed by a loyalist settlement. Upon learning of your quest, they offer you supplies.",
  "Debris from a forgotten battle still orbits the gas giant in this system. Some of it still might be usable.",
  'You receive a message from a nearby station, "A Federation cruiser jumping into Rebel territory? Quite the bold move." You quickly move to arm the weapons but he continues, "Lucky for you we\'re not all in support of the Rebellion. Perhaps these supplies will help you get to friendlier space alive."',
  "You happen upon the remains of a space station. It has been mostly picked clean but there appears to be a few materials that will aid you in your mission.",
];

// Slug fight in plasma storm. The page prints four intros and no odds.
// INFERRED: equal. The fight stays c:slug-fight-in-plasma-storm:0.
// Pirate ship distress trap. The page prints four intros and no odds.
// INFERRED: equal. The fight stays c:pirate-ship-distress-trap:0.
const PIRATE_DISTRESS_TRAP_INTROS = [
  "You arrive at the beacon and immediately detect a pirate ship. It seems this distress beacon was a trap!",
  '"Haha! I knew someone would fall into our dastardly trap!" It appears this distress beacon was nothing but a decoy for a pirate ambush.',
  "Your cockpit lights up with warning signals. You are being targeted by a nearby ship. The distress call was a lure to attract unwitting ships into weapons range. You prepare for a fight.",
  "As soon as you arrive at the distress signal, shots are fired toward your ship. A trap!",
];

const SLUG_PLASMA_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Slug fight in plasma storm]]
  // > "The ion storm here threatens to deactivate your core systems, a fact made all the worse for the largely unaffected Slug ships circling like space-vultures." — [[Slug fight in plasma storm]]
  // > "The Slug ship that descends into view as you enter the ion storm must have sensed your distress - defensive action!" — [[Slug fight in plasma storm]]
  // > "You arrive in the middle of an ion storm. Slugs generally avoid these storms but you find one waiting in ambush. Prepare for a fight!" — [[Slug fight in plasma storm]]
  // > "You find yourself stuck in the middle of an ion storm with a Slug ship just a short distance away, refusing all hails. You cautiously try to slip further into the clouds, but they turn suddenly to attack!" — [[Slug fight in plasma storm]]
  "The ion storm here threatens to deactivate your core systems, a fact made all the worse for the largely unaffected Slug ships circling like space-vultures.",
  "The Slug ship that descends into view as you enter the ion storm must have sensed your distress - defensive action!",
  "You arrive in the middle of an ion storm. Slugs generally avoid these storms but you find one waiting in ambush. Prepare for a fight!",
  "You find yourself stuck in the middle of an ion storm with a Slug ship just a short distance away, refusing all hails. You cautiously try to slip further into the clouds, but they turn suddenly to attack!",
];

// Free weapon. The page prints six intros and no odds.
// INFERRED: equal. The gift stays c:free-weapon:0.
const FREE_WEAPON_INTROS = [
  "Holy crap! A weapon is just floating in space!",
  "You inform a nearby station of your flight from the Rebels. They offer to outfit your ship with a weapon and wish you well.",
  "A settlement still loyal to the Federation hails your ship. They have prepared a weapon to aid your escape from the Rebels.",
  "As soon as you arrive a small Mantis ship detaches from a wreck and jumps away. You must have interrupted their salvage operation because you find a weapon ready to be installed!",
  "A small merchant ship messages you, \"Underground Federation comm channels are all talking about your 'secret' mission. Let us install a weapon to help. Good luck!\"",
  "Debris from a battle is scattered around this system. A few pieces bounce against your ship. You passively scan them and discover there is a functioning weapon among them!",
];

// Rebel checkpoint. Four intros and four hide labels, no odds. INFERRED: equal.
const REBEL_CHECKPOINT_INTROS = [
  "A rather large fleet of civilian ships are held up at this Beacon. It appears to be a Rebel checkpoint; everyone is being inspected for possible ties to the Federation. No one has noticed you yet.",
  "Another Rebel checkpoint is monitoring this location. A number of civilian ships are awaiting inspection, any of them could be Federation loyalists. The Rebels haven't noticed you yet.",
  "A Rebel space station and single fighter is monitoring this Beacon for Federation activity. A number of civilian ships are docked, awaiting inspection by the Rebels and possible detainment if they are Federation loyalists. The Rebels haven't noticed you yet.",
  "It looks like this Beacon is home to a Rebel checkpoint. They're stopping and searching any ship that passes through. Civilians are being harassed, and Federation members are detained. The Rebels haven't noticed you yet.",
];
// Pirate fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-near-pulsar:0.
const PIRATE_PULSAR_INTROS = [
  "Sensors go wild as a nearby pulsar is detected. While you are attempting to recalibrate the FTL drive, a pirate sneaks up on your ship, weapons charging. Prepare for a fight!",
  "You arrive to find a pulsar dominating the view screen. You see a small silhouette pass in front of the star. Before you can ponder what it is, warning signals go off. It appears to be a ship in a firing trajectory!",
  "A small research station orbits a nearby pulsar. It appears largely abandoned, but you detect power signatures flaring up as soon as you're in scanning distance. A small combat ship launches from the station. Pirates!",
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
  "You encounter a Rock vessel and attempt to open trading frequencies, but they take it as an act of cultural transgression and open fire.",
  "You jump into the middle of a Rock excavation project on a nearby moon. Unimpressed with your intrusion they move to defend themselves!",
  'You intercept chatter from an approaching Rock ship: "Weapons, moving in to engage, arm the tubes." There is no talking to these guys.',
  "As you jump in, a vast figure appears on the view-screen. The Rock captain rubs the green, moss-like appendage on his chin and then orders his crew to open fire.",
  'It looks quiet, but you realize your computer is being scanned. A hidden Rock vessel hails you: "Why do you fill your computer with lies?! These are not the holy words!" Before you can interject they open fire.',
  "You notice a Rock ship performing combat exercises. However, they quickly change their course to engage your ship. They apparently treat unregistered alien ships as handy target practice.",
  "A loud 'thud' resounds through the ship after jump completion - you've just shunted a Rock fighter and he's already preparing to fire!",
  "You're intercepted by a Rock salvage operation. They don't seem to mind that you're still on board while they junk your ship.",
];

// Rebel fight (Lanius). Six printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-lanius:0.
const LANIUS_REBEL_INTROS = [
  "You intercept discussions between a Rebel patrol and a human mining colony, \"...we realize you're scared but all reports indicate the metal bastards target abandoned settlements only. If we relocated our fleets based on every request from backwater... wait, what's that...\" Before you can react, the channel is cut and the Rebel ship moves in to attack.",
  'You arrive to see a number of Rebel ships attempting to dissuade Lanius scavenger ships from "acquiring" their forward station. A passing Rebel patrol ship spots you and moves in to intercept.',
  'A Rebel scout patrols near the beacon. "Hah! I knew you would try to sneak through this sector as soon as I heard it had become treacherous. Surrender!"',
  "You arrive at the beacon and notice a small Rebel ship chasing Lanius scavengers away from a wrecked Rebel battleship. As soon as the Rebel notices you and moves in to attack, the Lanius ships return to their prey like flies on garbage.",
  'A Rebel messages you. "Who would have thought the most wanted ship in the quadrant would just happen by my station? Prepare to meet your maker."',
  "Your arrival coincides almost exactly with that of a Rebel ship. It's hard to know who is more surprised, but there is no option but to fight.",
];

// Rock fight with boarders. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-with-boarders:0.
const ROCK_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders]]
  // > "You passively scan a small Rock station that is next to the beacon. However they must not have appreciated your curiosity. A Rock ship pulls away from the station and you register an incoming teleporter signal as well!" — [[Rock fight with boarders]]
  // > "You find a Rock ship docked with a damaged Mantis fighter. Before you have a chance to hail them, the ship moves in to attack you and you register teleporter symbols from the disabled ship. They're using Mantis tech to board you!" — [[Rock fight with boarders]]
  "You passively scan a small Rock station that is next to the beacon. However they must not have appreciated your curiosity. A Rock ship pulls away from the station and you register an incoming teleporter signal as well!",
  "You find a Rock ship docked with a damaged Mantis fighter. Before you have a chance to hail them, the ship moves in to attack you and you register teleporter symbols from the disabled ship. They're using Mantis tech to board you!",
];

// Auto-ship fight. Nine printed intros, no odds. INFERRED: equal. The fight stays c:auto-ship-fight:0.
// Auto-ship warning prints the same nine lines. That fight stays c:auto-ship-warning:0.
const AUTO_SHIP_FIGHT_INTROS = [
  "You discover one of the Rebel's autonomous scouts. The ship's AI wastes no time in engaging your ship.",
  'Your ship is hailed: "This is an automated message. Resisting our takeover is pointless. Prepare to die." It appears this Rebel ship is run by an AI.',
  "A Rebel autonomous scout is exploring this beacon. You attempt to hide behind a nearby moon, but the ship finds you and begins its assault.",
  "The AI of a nearby small Rebel scout immediately identifies you as a threat and engages.",
  "A Rebel ship moves in to engage. You attempt to open communications, but realize the futility of that action when you see the ship is run by an AI.",
  "This must be one of the Rebels' unmanned scout ships. Looks like there's no way around a fight.",
  "Another unmanned ship patrols this area. You prepare the ship for combat.",
  "This beacon is being patrolled by a unmanned scout. A fight is unavoidable.",
  "A small shuttle appears on the local radar. Turns out it is a Rebel automated scout!",
];

// Rebel fight with boarders. Four printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-with-boarders:0.
const REBEL_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight with boarders]]
  // > "You receive a message from a nearby Rebel station, \"You have a lot of guts passing through our space, I'll give you that.\" He turns giving an order, \"Kill their crew, I want that ship intact.\"" — [[Rebel fight with boarders]]
  // > "Your sensors warn of an incoming Rebel ship at the same time as you hear the telltale signs of a teleporter. You hear someone taunt from within the ship, \"Ready to die? I sure am ready to get a promotion!\"" — [[Rebel fight with boarders]]
  // > "Incoming message, \"Hello Captain,\" says a Rebel in an officer's garb. \"How very generous of you to turn yourself in. Prepare to be boarded. Come quietly and we may be lenient.\"" — [[Rebel fight with boarders]]
  // > "You receive a message on a low-band channel. \"You're surrounded, just like the last of your Federation friends. Just die already.\" The enemy has teleported onto your ship!" — [[Rebel fight with boarders]]
  'You receive a message from a nearby Rebel station, "You have a lot of guts passing through our space, I\'ll give you that." He turns giving an order, "Kill their crew, I want that ship intact."',
  'Your sensors warn of an incoming Rebel ship at the same time as you hear the telltale signs of a teleporter. You hear someone taunt from within the ship, "Ready to die? I sure am ready to get a promotion!"',
  'Incoming message, "Hello Captain," says a Rebel in an officer\'s garb. "How very generous of you to turn yourself in. Prepare to be boarded. Come quietly and we may be lenient."',
  'You receive a message on a low-band channel. "You\'re surrounded, just like the last of your Federation friends. Just die already." The enemy has teleported onto your ship!',
];

// Boarders: Mantis. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-mantis:0.
const MANTIS_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Mantis]]
  // > "A derelict and still smoking Mantis vessel floats by. The battle must have been recent; its surviving crew beam aboard. Prepare for a fight!" — [[Boarders: Mantis]]
  // > "Your world, all of a sudden, changes. The Mantis are on board your ship." — [[Boarders: Mantis]]
  // > "You hear a grating rattle and a soft clicking. You reach for your pistol." — [[Boarders: Mantis]]
  "A derelict and still smoking Mantis vessel floats by. The battle must have been recent; its surviving crew beam aboard. Prepare for a fight!",
  "Your world, all of a sudden, changes. The Mantis are on board your ship.",
  "You hear a grating rattle and a soft clicking. You reach for your pistol.",
];

// Boarders: Humans in nebula. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-humans-in-nebula:0.
const NEBULA_HUMAN_BOARDER_INTROS = [
  "You see a small station nearby and feel the shudder of shots ringing through the ship. You can't be sure without sensors, but it seems there may be intruders on the ship!",
  'You arrive in the nebula and immediately receive a message from an unknown source, "Prepare to be boarded!" With the static from the nebula, there\'s no way to tell where they came from, but you hear shots fired on board the ship.',
  "You see a number of derelict ships near this beacon. After a short time you hear the tell-tale sounds of a teleporter and shouts coming from within the ship. You've been boarded!",
];

// Boarders: Crystal. The page prints three intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-crystal:0.
const CRYSTAL_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Crystal]]
  // > "You detect a heavily armed Crystalline ship escorting some sort of prison vessel. Scans indicate there are a number of non-Crystal based life forms aboard; they must be rounding up all of the intruders in their space! Before you can react, you hear the telltale sounds of a teleporter going off." — [[Boarders: Crystal]]
  // > "You arrive near a small settlement and a lone guard ship moves to intercept you. You try to contact them but they are refusing all hails. Suddenly you hear lasers ricocheting from within the ship. You've been boarded!" — [[Boarders: Crystal]]
  // > "You pick up chatter from a nearby ship, \"Yes... Here are some interesting specimens. Try to take them alive this time, there's a lot of money to be had on aliens.\" Scanners indicate a remote teleporter was just used." — [[Boarders: Crystal]]
  "You detect a heavily armed Crystalline ship escorting some sort of prison vessel. Scans indicate there are a number of non-Crystal based life forms aboard; they must be rounding up all of the intruders in their space! Before you can react, you hear the telltale sounds of a teleporter going off.",
  "You arrive near a small settlement and a lone guard ship moves to intercept you. You try to contact them but they are refusing all hails. Suddenly you hear lasers ricocheting from within the ship. You've been boarded!",
  'You pick up chatter from a nearby ship, "Yes... Here are some interesting specimens. Try to take them alive this time, there\'s a lot of money to be had on aliens." Scanners indicate a remote teleporter was just used.',
];

// Boarders: Rockmen near sun. The page prints two intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-rockmen-near-sun:0.
const ROCK_SUN_BOARDER_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Boarders: Rockmen near sun]]
  // > "As soon as you arrive you hear the telltale sounds of a teleporter and shouts reverberating through the ship, \"Prepare to burn, fleshy meat-sack aliens!\"" — [[Boarders: Rockmen near sun]]
  // > "With their high resistance to heat, outlaw Rocks often settle very close to stars. That is why it is hardly surprising when your ship gets boarded as you stumble past a hidden settlement." — [[Boarders: Rockmen near sun]]
  'As soon as you arrive you hear the telltale sounds of a teleporter and shouts reverberating through the ship, "Prepare to burn, fleshy meat-sack aliens!"',
  "With their high resistance to heat, outlaw Rocks often settle very close to stars. That is why it is hardly surprising when your ship gets boarded as you stumble past a hidden settlement.",
];

// Boarders: Humans (Pirate). The page prints five intros and no odds.
// INFERRED: equal. The boarders stay c:boarders-humans-pirate:0.
const PIRATE_HUMAN_BOARDER_INTROS = [
  "What appears to be a civilian ship sends a friendly hail. As you approach the vessel, you detect a teleporter signal but it's too late... intruders have beamed aboard!\"",
  'A heavily damaged ship is drifting near this beacon. You receive a communication: "Hello! Nice of you to drop by. As you can see, our ship has seen better days. Yours is looking quite nice, I think we might be taking it from you now." Intruders beam aboard.',
  "You detect life-signs actually on the beacon itself! A teleporter signal warns you but it's too late, they've beamed from the beacon onto your ship and seem intent on taking it over.",
  "Your ship detects a faint distress signal on a nearby moon. As you approach the rock, warning lights flash as hostiles beam aboard the ship from some hidden location.",
  "As you arrive, you become aware of a small Rebel outpost near the beacon. You are hardly able to bark an order before a small team is beamed aboard your ship. They must have been expecting you...",
];

// Rock fight with boarders in asteroid field. Two printed intros, no odds. INFERRED: equal.
// The fight stays c:rock-fight-with-boarders-in-asteroid-field:0, which already beams 1-2 Rock boarders inside an asteroid field.
const ROCK_BOARDER_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight with boarders in asteroid field]]
  // > "You arrive in an asteroid field and immediately begin evasive maneuvers when a loud clunk reverberates through the ship. At first you think the hull has been hit, but the noise came from some Rock intruders teleporting aboard the ship!" — [[Rock fight with boarders in asteroid field]]
  // > "''Your shields are being taxed as they deflect the debris from an asteroid field. As you weave your way between the rocks, you happen upon a Rock pirate stronghold. You register teleport signatures and hear shouts aboard the ship.'" — [[Rock fight with boarders in asteroid field]]
  "You arrive in an asteroid field and immediately begin evasive maneuvers when a loud clunk reverberates through the ship. At first you think the hull has been hit, but the noise came from some Rock intruders teleporting aboard the ship!",
  "Your shields are being taxed as they deflect the debris from an asteroid field. As you weave your way between the rocks, you happen upon a Rock pirate stronghold. You register teleport signatures and hear shouts aboard the ship.",
];

// Lanius fight. Eleven printed intros, one repeated, no odds. INFERRED: equal, so the repeated line is twice as likely.
// The fight stays c:lanius-fight:0. Default Lanius rewards are not a separate payout.
const LANIUS_FIGHT_INTROS = [
  'You receive a message on a wide band frequency, originating from an approaching Lanius ship. It appears not to be directed at you, but your translator does its best all the same: "... metallic opportunity... acquisition... by force..." Looks like you\'re in for a fight.',
  "Sensors indicate a small Lanius cruiser in the process of salvaging another small Lanius ship. Before you have a chance to wonder what caused them to turn on each other, the survivor notices you and moves in to attack.",
  "Shortly after your arrival, a Lanius ship jumps near the beacon. It begins to move slowly toward you. You open wide band communication channels, attempting to make contact. However, it either ignores you or is unable to receive the messages. As they get closer you issue the order to charge weapons and find they do the same.",
  "A military Lanius vessel stops repurposing an abandoned satellite as soon as you jump in. It blocks all hails and powers its weapons.",
  "The beacon is surrounded by many tiny Lanius crafts, surely only capable of holding one occupant. Perhaps they are some kind of forward scout searching for 'metallic opportunities'? As you consider this, a much larger Lanius vessel moves in to engage you, and the scout ships scatter in all directions.",
  "You arrive to see a well-armed Lanius craft preparing to salvage a badly damaged Rebel patrol ship. Noticing your arrival, the Lanius greedily moves in to intercept its second target of the day.",
  "As you arrive in the system, your proximity alarm begins screaming: there is a Lanius ship right on top of you! Before you have a chance to hail, they open fire!",
  "As you are getting your bearings, another ship suddenly arrives at the beacon - it's the Lanius, and they've marked your ship for salvage!",
  "At first everything seems quiet, then your scanners pick up a ship approaching at high speed - the Lanius have detected your arrival and are powering up their weapons!",
  "You have stumbled across a mining expedition - unfortunately, the miners are the Lanius, and they've chosen your ship as their target!",
  "As you are getting your bearings, another ship suddenly arrives at the beacon - it's the Lanius, and they've marked your ship for salvage!",
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
  "A mixed radar signal turns out to be a Mantis attack ship scavenging the remains of an Engi carrier. They turn and fight.",
  "You come across a Mantis raider taking pot shots at a defenceless Engi supply station. Discovering its weapons aren't much of a match for the station's armour, it turns on your ship. Battle stations!",
  "The area looks clear, and you prepare to jump off, but a Mantis scout jumps in behind you! They're as surprised as you are, but their weapons are already online.",
  "You find a Mantis ship harrying a small squad of Engi. They make it to the node and jump off, leaving you toe to toe with their pursuer!",
];

// Mantis fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight-in-nebula:0. Default Mantis rewards are not a separate payout.
// The storm words are the printed lines. They do not arm an ion storm.
const MANTIS_NEBULA_INTROS = [
  "Nebulas are known to be popular Mantis hunting grounds. Information you would have done well to heed here.",
  "You detect a Mantis expedition vessel returning home with its haul. So determined are they, in fact, that they don't wait to see if you're hostile before firing.",
  'A Mantis ship, lost in the storm, hails you. "Sensors are out. We have no local telemetry. We will take yours." You detect a power increase in their weapons systems.',
  'A Mantis ship hails you through the storm: "These are sacred Urggghtnag clan hunting grounds. You are prey." Shields up!',
  "You notice a Mantis attack ship ducking between the clouds of swirling space stuff; it's hunting you. You try to get the jump and move in to attack.",
];

// Mantis fight. Twenty printed intros, no odds. INFERRED: equal.
// The fight stays c:mantis-fight:0. Default Mantis rewards are not a separate payout.
const MANTIS_FIGHT_INTROS = [
  "A Mantis military ship appears on local radar alongside the remains of a human freighter. Prepare for a hostile encounter!",
  'A Mantis military scout hails your ship. "Foolish alien! Your kind has stifled our greatness for too long! You will rue the day you backed the Federation!"',
  'A small Mantis cruiser is broadcasting a repeating message on a wide-band frequency, "All non-Mantis ships that enter our territory are forfeit. Lower your shields and surrender if you value your lives."',
  "You detect a small military outpost and a few freighters nearby. This mineral rich planet in an isolated location would be perfect for an illegal Mantis mining operation. As you consider your options, a ship launches from the outpost. Prepare for a fight.",
  "You discover yet another unlicensed and uncharted Mantis colony. They certainly waste no time expanding their claims. A Mantis ship moves to intercept you before you can jump away.",
  "A Mantis military scout seems to have just finished a salvage op on a nearby wreck. They have no time to waste with warnings and appear to wish to fight.",
  'A small military craft hails you and a Mantis captain appears on your receiver. "All local human colonies have been punished for the Federation\'s transgressions. Submit to processing."',
  "A nearby Mantis ship begins aggressive maneuvers. You prepare for the worst.",
  "A stream of clicks and gurgling comes on the comm from a hostile Mantis scout. The universal translator might be on the blink, but his intent is obvious.",
  "The Mantis ship is pleased to see you, and fires up its weapon systems.",
  "You recognize the outline of a Mantis ship against the blackness. Engage!",
  "Something red looms. It's the Mantis.",
  'A Mantis vessel hails you. "This hail is merely a distraction!" You notice their shields and weapons have come online.',
  "You notice a flurry of laser fire glance by the port window. The Mantis are upon you.",
  'The Mantis hail you. Their captain says, "I claim this vessel for my clan. Good hunting!"',
  "A Mantis female comes on the vidscreen. The females don't make it to authority unless they're particularly vicious. You power the weapons.",
  "A Mantis ship with the markings of a warrior tribe breaks position and attacks!",
  'A Mantis ship hails: "Ah! Fine prey. Fine prey! We honor you with our most eviscerating arsenal!" You sense a cloud to this silver lining and power the weapons.',
  "Children on Earth are told terrible tales of the blood red Mantis invasion ships - much like the one bearing down on you now - which once threatened the planet. You order weapons free!",
  'A youthful-looking Mantis captain hails. "You, prey, must know. Your death, Kaaazthwak\'s final kill before maturity. Kaaazthwak pay respects." Seems respects in Mantis culture are paid with lasers.',
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
  "You're greeted by a rare sight: a Mantis ship that appears not to have noticed you.",
  "For once, you see the Mantis before they see you.",
  "When they see the Mantis warship waiting in ambush at your intended coordinates, your crew is relieved to note you've jumped someway off the mark.",
  'You overhear Mantis comm chatter: "Negative, I have killed more humans!" You gulp noticeably, but luckily they don\'t see you yet.',
  'You overhear Mantis comm chatter: "The one on the right is starting to rot. Take him down. Take off his fingers. Put him out of the airlock." They certainly don\'t seem to be friendly...',
  'You overhear Mantis comm chatter: "Agreed. Next ship is your turn. Good hunting." They don\'t see you yet.',
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
  "You spot a Mantis ship hunting in the distance.",
  'A Mantis ship engaging a civilian hails you. Sparks fly about his cockpit as he yells, "Stay out of this human! Else you are next!"',
  "Local sensors pick up two ships engaged in a heated battle. It seems the Mantis military ship will surely defeat its prey.",
  "A Mantis vessel flashes past your view-screen, weapons and engines at full. A tiny blip on the sensor readout marks its quarry.",
  "You pick up a distress call from a civilian ship. It's being chased by a Mantis ship!",
];

// Pirate ship attacking civilian. Six printed intros, no odds. INFERRED: equal.
// Aid stays c:pirate-ship-attacking-civilian:0. Stay out stays :1. The stay-out sentence is quests.ts.
const PIRATE_CIVILIAN_INTROS = [
  "You arrive in the system to see a pirate ship pursuing a civilian ship. You detect messages from the civilian ship on a distress frequency.",
  "Scanners indicate that a battle is taking place nearby. It seems that someone is under attack by space pirates.",
  "You detect two ships, one chasing the other... Scanners show the pursuer is a pirate!",
  "There are only two ships within range and they seem to be engaged in battle. One of them has the markings of a space pirate.",
  'You arrive at the next beacon only to immediately be hailed by a small shuttle. "Help us! We are being attacked by pirates!"',
  "You come out of the jump to see laser blasts coming from the other side of the beacon. It looks like someone is under attack from pirates.",
];

// Pirate ship attacking civilian (Lanius). Three printed intros, no odds. INFERRED: equal.
// Attack stays c:pirate-ship-attacking-civilian-lanius:0. Avoid stays :1.
const LANIUS_PIRATE_CIVILIAN_INTROS = [
  "You discover an abandoned mining facility in the process of being 'acquired' by the Lanius. However, you immediately receive a call from a civilian transport vessel, \"Help! We were trying to escape before the Lanius came only to be caught by pirates!\" You see a lone pirate ship boarding the civilian craft.",
  "A pirate ship emerges from hiding after you and another ship jump into the area. Sensors show the pirates ran a quick scan of your ship's weapon system before flying off to pursue the unarmed civilian ship.",
  "A pirate ship is firing on the small ships docked at a refueling station. They are broadcasting on a wide band channel. You catch the captain's rant mid-speed, \"...saw you trading with those damned scavengers. I'll show you what happens when you try and undercut the Red Giant gang!\"",
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
  "As you drift through the nebula an unmarked vessel descends from the clouds and into your wake. Their weapons come online.",
  'A pirate ship pulls out of the ether and hails: "You know what I love about this part of the galaxy? The explorers! You always carry such fine loot." They lock weapons.',
  "As you coast through the nebula a pirate ship matches your course and closes the distance. Better to pick your battleground, but beggars can't be choosers.",
  "A hostile vessel descends from out of the nebula. Combat stations!",
  "You try to read the ID of a ship ahead in the fog, but it's too thick to penetrate. You have your answer when the ship turns, weapons hot!",
];

// Rebel fight in nebula. Seven printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-in-nebula:0. Default rewards. No nebula environment is added.
const NEBULA_REBEL_INTROS = [
  "You cross paths with an advance scout of the Rebel fleet searching this section of the nebula for your ship.",
  "A ship bearing Rebel colors can be seen waiting near the beacon. They must have been waiting for you, since they engage immediately.",
  "The Rebels must have anticipated you would try to lose them within the nebula. A scout is waiting for you at the beacon.",
  "It looks like you will be unable to avoid the Rebels by traveling through the nebula. A Rebel ship is waiting for you near the beacon.",
  "Shortly after you arrive, a Rebel ship jumps nearby. There looks to be no escape. Prepare for a fight!",
  "Newton-knows what brings this Rebel ship so far out; its captain hails, but does a double take when he identifies your ship. They open fire.",
  "A Rebel ship hails, but you don't take chances in conditions like this. You block the frequency and prepare to engage.",
];

// Auto-ship fight in nebula. Five printed intros, no odds. INFERRED: equal.
// The fight stays c:auto-ship-fight-in-nebula:0. The destroyed reward is quests.ts. No nebula environment is added.
const NEBULA_AUTO_INTROS = [
  "You cross paths with an advance scout of the Rebel fleet searching this section of the nebula for your ship.",
  "You jump into a calmer part of the nebula. However, your relief fades as a Rebel scout jumps to the beacon and moves in to attack.",
  "The tangled wrecks of many ships wait in dormancy here. You see lights flicker on what looks like debris. A Rebel scout bursts out of the wreckage!",
  "This drone isn't looking for you. Perhaps it's scouting ahead for the Rebel expansion or maybe they're seeking to use this nebula for cover. Regardless, it identifies you as hostile.",
  "It's worrying that the Rebels have penetrated so deep into uncharted space, even if it is only an unmanned craft. It arms its weapons; you should do the same.",
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
  'A Zoltan ship makes contact. "The nature of the day is rotational. The fever is emaciated. The reason is-" They\'ve caught some nasty deep space dementia. Before you can consider finding help for them, they open fire.',
  "You're surprised when a stationary Zoltan ship opens fire. It appears there are aggressive pugilists even among the 'enlightened'.",
  'You receive a message, "This area is off limits. Submit your ship to processing." It\'s only one guard ship in a lonely beacon. You decide to fight your way out.',
  "You discover a number of Zoltan civilian ships fighting off pirates. Unfortunately one ship mistakes your purpose and moves in to attack! They are refusing all communication; you have no choice but to fight.",
  "Like many areas in Zoltan space, the residents of this sector prepared well for Galactic war. The military here seem to have given up reasoning with foreigners, preferring instead to attack on sight!",
  "A Zoltan ship is waiting at this beacon. They request your identification, but radiation from the sun in this system is disrupting your communications. They take your silence for aggression and move in to attack.",
  'The Zoltan ship patrolling this area hails you: "This area is off limits. Secrecy is vital." They power their weapons.',
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
  "You arrive near a fleet of crystal ships, civilian or mercantile from the looks of them. You pause to scan one but they react immediately and send an escort to fight you off. Prepare to engage!",
  "You arrive at the Beacon and are immediately greeted by an automatic message or warning of some kind. The translator can't seem to discern its purpose but after a few short moments an alarm goes off and a hostile ship jumps in!",
  'You receive a message, "Hah. It looks like another worthless alien-filled craft. Prepare to meet your maker!" Weapon locks detected.',
  'A Crystalline ship messages you, "I\'ve heard tales that our isolation has finally ended. As a warrior I must demand to test my skills against you!" Before you can respond they move in to attack.',
  "You arrive in a busy sector. At first no one pays any mind to your alien ship but soon you're registering a number of scan signatures. You get the feeling you're not wanted here just seconds before registering enemy weapon locks!",
  "You jump next to a node busy with traffic, but before long all nearby ships notice you and keep their distance, uncertain of your allegiance. After an awkward standoff, a military ship breaks away from the rest and charges you.",
  "A barrage of rasps and clicks is broadcast over the comm; the universal translator understands little, but the words 'aliens', 'allowed' and 'no' come through quite clearly. You'll have to prove your right to be here in combat!",
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
  "Although you were expecting the Rebels, you never imagined their fleet could have grown so fast. Your scanners can hardly register them all before a fighter stationed nearby moves in to attack.",
  "This system is flooded with Rebel warships. Luckily your ship's signature is disguised as a civilian transport. Most heavy vessels ignore you but a small fighter is approaching with weapons hot!",
  "You arrive to find a Rebel battalion encircling a nearby planet, launching landing parties. A small scout moves toward your position. Prepare for a fight!",
  "As soon as you arrive you find yourself in the debris of a fierce battle. However, only Rebel warships remain and you find yourself immediately under attack.",
  "Shots fly by and your computer registers multiple weapon locks as soon as you arrive. Evasive action!",
  "What was once a great series of space stations is now nothing but a small ring of debris around the nearby moon. There's no time to mourn the dead; an enemy approaches!",
  "The Federation seems to have put up a good fight. A number of Rebel ships lie broken or wounded. However their overwhelming numbers force the remaining Federation forces to retreat. Hopefully you can get away in time as well.",
];

// Rebel fight among Federation and Rebel fleets. Six printed intros, no odds. INFERRED: equal.
// The fight stays c:rebel-fight-among-federation-and-rebel-fleets:0. Escape and the scrap payouts stay elsewhere.
const FEDERATION_FLEET_INTROS = [
  "You arrive in the middle of a raging battle. Both sides are taking heavy losses. A small squadron flies past and a fighter breaks off, moving toward your position.",
  "Two fleets fight nearby. You try to skirt around the edges of the battle and keep out of weapons range, but a Rebel scout spots you and moves in.",
  "It's hard to tell who is winning the nearby battle. Before you have a chance to figure it out, a fighter moves in to attack.",
  "The sheer scale of the destruction in the distance is almost breath-taking. Unfortunately, your position as an independent observer doesn't last for long!",
  "The destruction in the distance is almost awe-inspiring. However you're dragged back to reality as Sensors indicate you are under attack.",
  "You don't have any time to worry about the battle in the distance. The fight is coming to you really quickly!",
];

// Lanius ship attacking civilian. Three printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-attacking-civilian:0. Avoid stays the nothing choice.
const LANIUS_CIVILIAN_INTROS = [
  'You immediately receive a message upon arrival, "Help! These metal bastards have gone crazy!" The communication originates from the hull of a partially dismantled ship which lies among a number of other destroyed ships. The violent Lanius ship responsible for this carnage is advancing on the survivors.',
  "You scan the area after arriving at this system. A Lanius ship is in fast pursuit of an unarmed civilian ship. It's hard to say if it's truly a threat since its weapons are not charging.",
  "You arrive at the location of a recent battle. Judging from the debris, some settlers attempted to fight off a number of small Lanius ships, although it's impossible to say who instigated the aggression. A few skirmishes can be seen in the distance, but more notably a lone Lanius ship is firing on a heavily damaged civilian vessel.",
];

// Lanius ship salvager. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:lanius-ship-salvager:0. Leave stays :1. The Lanius scrap request stays :2.
const LANIUS_SALVAGER_INTROS = [
  "You come across a single Lanius ship salvaging a small civilian craft. You cannot tell if they attacked the craft or just happened upon it.",
  "There are remnants of a fierce battle here. Scattered among the hulks are small Lanius craft, slowly breaking apart the wrecks. One of the ships is close enough that you could probably attack it without immediately alerting the others.",
  "When you arrive at the beacon you discover what must have been remnants of a large battle. However the vast majority of metal has been striped from the ships, only various plastic and other materials float in a ring around a planet. A lone Lanius ship moves between the wreckage looking for more salvage.",
  "A small asteroid belt is near this jump beacon. It must be mineral-rich since a Lanius ship is docked on a large rock, slowly absorbing parts of it. You could probably get their attention pretty easily.",
  "A Lanius ship is slowly salvaging what remains of a small research station. It's hard to say if it was abandoned or attacked by the Lanius.",
];

// The mercenary. Six printed intros, no odds. INFERRED: equal.
// Delay stays c:the-mercenary:0. Fight stays :1. Decline stays :2.
const MERCENARY_INTROS = [
  "You find a mercenary for hire at this Beacon. Their unique skills can sometimes prove to be useful.",
  'A mercenary hails you: "Greetings, friend! We\'ve heard tell of your quest and are here to offer our valuable services."',
  'There\'s a ship with pirate markings orbiting the nearby planet. You receive his hail: "Anything is possible, for the right price"',
  'The captain of this ship claims he can provide "services" as long as you\'ve got the scrap.',
  "Mercenaries are swarming the galaxy now, knowing that their less-than-legal services are in demand during this period of unrest. One is waiting at this beacon and hails you.",
  "A ship hails you: \"Good sir! It seems you're having some troubles with the Rebels. I'd like to help you, but I can't afford the upkeep required on this hunk of junk I'm flying... maybe we can come to an arrangement?\"",
];

// Rebel ship supplying civilians. Five printed intros, no odds. INFERRED: equal.
// Attack stays c:rebel-ship-supplying-civilians:0. Leave stays :1. Wait and steal stays :2.
const REBEL_SUPPLY_INTROS = [
  "You stumble across a Rebel ship distributing supplies to local civilian colonies. It's probably not anything military grade, but every little bit helps...",
  "You find a Rebel combat ship that has been reassigned as an emergency supply vessel. The local civilians are apparently in need of help, and the Rebels are rising to the occasion.",
  "The Rebels in this system are doing supply runs for the local space stations. These civilians have likely been out of supply for months due to the war and are in desperate need.",
  "Civilian colonists loyal to the Rebel cause are present on a nearby planet. It looks like they are currently receiving a supply shipment. Could be useful.",
  "Because of the war, thousands of colonists have had their supply lines disrupted and have found themselves in dire straits. It seems in this system, the Rebels are sympathetic and are distributing what little supplies they can spare.",
];

// Rebel ship attacking Federation loyalists. Three printed intros, no odds. INFERRED: equal.
// Aid stays c:rebel-ship-attacking-federation-loyalists:0. Escape stays :1.
const REBEL_LOYALIST_INTROS = [
  "Upon arriving at this beacon, you detect a distress call. Local scans reveal that a Federation transport is under attack from a Rebel scout!",
  "You immediately notice a Rebel ship chasing what appears to be a civilian transport. However you are detecting chatter on an encrypted Federation channel... That transport is carrying Federation loyalists!",
  "Your sensors are picking up a distress call on an encrypted Federation channel. You eventually find a Federation scout being chased by a Rebel fighter!",
];

// Pirate briber. Three printed intros, no odds. INFERRED: equal.
// Accept stays c:pirate-briber:0. Attack stays c:pirate-briber:1.
const PIRATE_BRIBER_INTROS = [
  'You come across a pirate in hot pursuit of an unidentified ship. You quickly receive a transmission from the pirate: "Stay out of this fight and we\'ll make it worth your while."',
  "An unidentified ship is badly damaged and still being assaulted by a space pirate. The victim begins a distress message until the pirate cuts in and offers to split the bounty if you sit tight.",
  'A missile shoots across your bow when the jump completes. Your scans quickly reveal a ship with pirate markings pursuing an unknown vessel. The pirate hails you: "Damn it, we weren\'t expecting company. Stay out of this and you could profit."',
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
  "Your sensors are no match for the Slug's telepathic abilities - a ship you never even saw opens fire from astern!",
  "The Slug vessel you encounter here has obviously made a big score and is looking to test its new armaments. They picked the wrong ship to attack.",
  'A Slug passenger ship hails: "Please, your worthy alien highnessesss, we are unarmed and sseeking asssylum." You approach cautiously, and weapons immediately spring from their hull!',
  "A Slug ship - a rogue, you suspect - approaches, but when he sees you're Federation he thinks better of the sneak attack and fires everything he has.",
  "Direct attacks are not preferred by the Slugs, but of the three you see at this beacon, one has the brass to make a move on your position!",
];

// Escort civilians. Three printed intros, no odds. INFERRED: equal.
// Accept stays the low fuel and the quest marker. Decline stays nothing.
const ESCORT_CIVILIAN_INTROS = [
  "After a short time you receive a message, \"Hello. I hope it's not a bother, but I'm looking for an escort to a nearby system. This region is quite dangerous and our ship is not well-armed.\"",
  'There is a single ship at this beacon. They hail you, "We could really use some help. Our FTL navigation system is shot. Can you help us get to a nearby station where they can patch us up?"',
  '"Hello," your communicator opens a hail from a nearby ship. "Our weapon systems are malfunctioning and we\'re too afraid of pirates to travel home unassisted. Can you escort us?"',
];

// Trade fuel for drone parts. Three printed intros, no odds. INFERRED: equal.
// The trade stays lose 2-4 fuel for 1-3 drone parts. Reject stays nothing.
const FUEL_FOR_DRONES_INTROS = [
  'A nearby space station hails you. "Greetings! Your arrival is most fortuitous. We recently came across some extra drones. If you have some fuel, perhaps we can make a deal?"',
  'A strange vessel approaches. A digital message appears on your view-screen: "This is an automated merchant. Refill this vessel with fuel and it will supply you with drones."',
  'You arrive in the sector and are greeted by a science vessel waiting by the beacon. They hail you, "We find ourselves low on fuel and have a proposition."',
];

// Rock pirates fight near sun. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-near-sun:0.
const ROCK_PIRATE_SUN_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight near sun]]
  // > "Unusual solar activity in this region means you need to get out, quick. The Rock pirate nearby apparently thinks otherwise as they move to attack your ship." — [[Rock pirates fight near sun]]
  // > "A Rock ship is silhouetted against a sun in supernova. They hail: \"Even out here you follow us! We only wish to be left alone!\" Out of panic or anger, they charge their weapons." — [[Rock pirates fight near sun]]
  "Unusual solar activity in this region means you need to get out, quick. The Rock pirate nearby apparently thinks otherwise as they move to attack your ship.",
  'A Rock ship is silhouetted against a sun in supernova. They hail: "Even out here you follow us! We only wish to be left alone!" Out of panic or anger, they charge their weapons.',
];

// Rock pirates fight in asteroid field. Two printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight-in-asteroid-field:0.
const ROCK_PIRATE_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight in asteroid field]]
  // > "Minute fissures in the shields spark and crackle as the ship jumps into the wake of a huge asteroid. More asteroids follow, as does a lost and aggressive Rock pirate ship." — [[Rock pirates fight in asteroid field]]
  // > "You exit the jump surrounded by dirt and rocks. Before long a blast is deflected by your shield, but that was no asteroid... Incoming pirate!" — [[Rock pirates fight in asteroid field]]
  "Minute fissures in the shields spark and crackle as the ship jumps into the wake of a huge asteroid. More asteroids follow, as does a lost and aggressive Rock pirate ship.",
  "You exit the jump surrounded by dirt and rocks. Before long a blast is deflected by your shield, but that was no asteroid... Incoming pirate!",
];

// Rock fight in asteroid field. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-fight-in-asteroid-field:0.
const ROCK_ASTEROID_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock fight in asteroid field]]
  // > "A Rock mining vessel is harvesting the mineral-rich asteroids in this locality, and their scouts take your presence to be a transgression. Battle stations!" — [[Rock fight in asteroid field]]
  // > "A rookie Rock cargo ship has taken its orders too literally and took the most direct route to their destination... right through an asteroid field. They're confused and fire wildly as you jump in." — [[Rock fight in asteroid field]]
  // > "The captain of a Rock freighter lost in the asteroid field hails you: \"Our co-ordinates led us here, but only death greets us. What must be must be. Death to all.\" You power up the battle systems and wonder how long they've been stuck here." — [[Rock fight in asteroid field]]
  "A Rock mining vessel is harvesting the mineral-rich asteroids in this locality, and their scouts take your presence to be a transgression. Battle stations!",
  "A rookie Rock cargo ship has taken its orders too literally and took the most direct route to their destination... right through an asteroid field. They're confused and fire wildly as you jump in.",
  'The captain of a Rock freighter lost in the asteroid field hails you: "Our co-ordinates led us here, but only death greets us. What must be must be. Death to all." You power up the battle systems and wonder how long they\'ve been stuck here.',
];

// Rebel fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-slug:0.
const SLUG_REBEL_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rebel fight (Slug)]]
  // > "As you arrive at the beacon, a hostile ship immediately registers on your scanners. You didn't expect to see Rebels extending their reach into Slug territory. Charge the weapons!" — [[Rebel fight (Slug)]]
  // > "You jump into empty space and are relieved to see your sensors blink back to life. However, you are less pleased to see them immediately register a rebel ship on an approach vector!" — [[Rebel fight (Slug)]]
  // > "You receive a message from a nearby ship, \"Looks like our intelligence was correct! Sneaking through the clouds with the Slugs... No one can hide from the rebellion!\"" — [[Rebel fight (Slug)]]
  "As you arrive at the beacon, a hostile ship immediately registers on your scanners. You didn't expect to see Rebels extending their reach into Slug territory. Charge the weapons!",
  "You jump into empty space and are relieved to see your sensors blink back to life. However, you are less pleased to see them immediately register a rebel ship on an approach vector!",
  'You receive a message from a nearby ship, "Looks like our intelligence was correct! Sneaking through the clouds with the Slugs... No one can hide from the rebellion!"',
];

// Pirate fight (Slug). Three printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-slug:0.
const SLUG_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Pirate fight (Slug)]]
  // > "There appears to be a pirate ship nearby. Be on your guard; anyone trying to hunt in Slug territory is either formidable or deeply stupid, and in space, either can be dangerous." — [[Pirate fight (Slug)]]
  // > "\"We knew anyone foolish enough to try and sneak through a Slug nebula would stick to open space. Yield your goods and we may let you live.\" You cut the transmission in lieu of a response." — [[Pirate fight (Slug)]]
  // > "Before you can take a moment's rest from the ever present nebulas in this sector, a pirate ship appears behind you and opens fire." — [[Pirate fight (Slug)]]
  "There appears to be a pirate ship nearby. Be on your guard; anyone trying to hunt in Slug territory is either formidable or deeply stupid, and in space, either can be dangerous.",
  '"We knew anyone foolish enough to try and sneak through a Slug nebula would stick to open space. Yield your goods and we may let you live." You cut the transmission in lieu of a response.',
  "Before you can take a moment's rest from the ever present nebulas in this sector, a pirate ship appears behind you and opens fire.",
];

// Pirate fight (Lanius). Five printed intros, no odds. INFERRED: equal. The fight stays c:pirate-fight-lanius:0.
const LANIUS_PIRATE_INTROS = [
  "An upgraded pirate ship sits among the remains of a number of Lanius ships. It hails you, \"These punks think they can jus' waltz in here into our sector? Obnoxious, right? Well, I'm sure you know the routine, let's do this.\"",
  'The pirate ship patrolling this sector has been busy. The debris of several Rebel scouts and at least one civilian ship litter the area. "Welcome, welcome, there\'s room for one more!" The over-confident pirate hails you as he charges his weapons and moves in to attack.',
  "A pirate ship appears to be threatening a small refugee ship near the beacon. Upon seeing you jump in, it turns to approach. The civilian wastes no time and jumps away, but that appears only to harden the pirate's resolve.",
  "Debris from a number of battleships are scattered around the beacon. As you approach the area a pirate ship thrusts itself through the hulks to attack. It must be using the metal to lure the Lanius into a trap.",
  "The pirate sees you before you see him... prepare for a fight!",
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
  '"Emergency, all ships in range, we are under attack!" The frequency matches a nearby Zoltan ship; you move in on their pursuer. They take your intervention as a cue to jump away. Cowards.',
  "You jump just in time to witness a Zoltan ship's FTL drive overload. In their final moments they implore you not to get involved, but it's too late - their attacker is already upon you!",
  "Despite their precautions, pirates have begun to harass the local Zoltan settlements across this sector. One such pirate spots your ship and moves in to attack.",
  "A ship with pirate markings demand that you surrender. These are sad times when even Zoltan space is beset by pirates. You doubt these fools will be missed.",
  "You spot a pirate ship looting a small Zoltan cruiser. They spot you and move in to attack before your FTL drive has a chance to recharge.",
];

// Rock pirates fight. Three printed intros, no odds. INFERRED: equal. The fight stays c:rock-pirates-fight:0.
const ROCK_PIRATE_INTROS = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[Rock pirates fight]]
  // > "As a naturally warlike species with few inter-galactic diplomatic ties, the Rock people have garnered quite a reputation as fearsome pirates. You stumble across one of their ships and they promptly live up to type." — [[Rock pirates fight]]
  // > "A Rock ship flies past your windows and you recognize outcast decorations on the hull. These must be pirates!" — [[Rock pirates fight]]
  // > "A motley collection of Rock ships are stationed around this beacon - they look to have resorted to a pirate's life. Defensive maneuvers!" — [[Rock pirates fight]]
  "As a naturally warlike species with few inter-galactic diplomatic ties, the Rock people have garnered quite a reputation as fearsome pirates. You stumble across one of their ships and they promptly live up to type.",
  "A Rock ship flies past your windows and you recognize outcast decorations on the hull. These must be pirates!",
  "A motley collection of Rock ships are stationed around this beacon - they look to have resorted to a pirate's life. Defensive maneuvers!",
];

// Rebel fight near pulsar. Three printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight-near-pulsar:0.
const REBEL_PULSAR_INTROS = [
  'A Rebel captain appears on the screen. "I thought we had been doomed to backwater assignments. This is my chance to get back in Command\'s good graces! Charge the weapons!"',
  "A small rebel research station overlooks a pulsating star. Before you can react a Rebel ship spots you and moves in to attack.",
  "You arrive at an infrequently used beacon close to a pulsar. Before long a Rebel ship happens to jump nearby. Looks like you'll have to fight.",
];

// Rebel fight. Ten printed intros, no odds. INFERRED: equal. The fight stays c:rebel-fight:0.
const REBEL_FIGHT_INTROS = [
  'Your ship is hailed. "We\'ve found you at last. Prepare to die!"',
  "A small Rebel ship is docked at a small station. You try to lay low but it spots you. Power up the weapons!",
  "A Rebel ship has been patrolling this region. As soon as you arrive it begins its assault.",
  'A Rebel ship hails you: "Federation scum! We\'ve waited a long time for this!"',
  "You receive a transmission: \"Sorry sir, this is nothing personal but we're under orders.\" The Rebel ship's weapons go hot.",
  "By the time you notice the Rebel ship behind the beacon, it's too late to avoid a fight.",
  'A Rebel ship hails. "We did not fight a war to let a single Federation ship shatter our dreams of a better galaxy!" He locks weapons.',
  'A Rebel ship approaches cautiously. "Personally," says the captain, "I\'d have stuck with the Federation. But I\'m a soldier, sir, and I\'m no use without a war to fight. Raise your shields!"',
  "You're hailed by a Rebel ship: \"When the rebellion is complete you'll see the safer world we provide. Well, you won't, but you get the point.\" They arm weapons.",
  "A Rebel ship is guarding this beacon. You order a pursuit course and prepare to scratch up one more.",
];

// Rebel ship attacking civilians in Last Stand. Five printed intros, no odds. INFERRED: equal. Both choices stay.
const LAST_STAND_CIVILIAN_INTROS = [
  "A number of large transports are being pursued by a Rebel bombing squadron. One bomber has managed to slip through the defensive fire, and is poised to wreak among the enormous yet vulnerable transports. There's time for you to advance and take it out!",
  "Shots fly by your port windows followed by a Rebel scout in pursuit of a damaged cruiser. Should we move in to engage?",
  "There seems to be a small Federation colony under attack by a Rebel forward scout. Will you protect them?",
  "A battle rages nearby between small fighters; apparently fighting over a space station. The Federation appears to be losing ships fast. Shall we assist them?",
  "A civilian ship is broadcasting a request for assistance on a secure Federation channel. They are being harassed by Rebel scouts. Will you respond?",
];

/**
 * Trade scrap for upgrades. The intro "can be any of the following".
 * INFERRED: the four printed texts are equally likely.
 */
const TRADE_INTROS = [
  "You pick up an automated message from a nearby space station. There appears to be a local shipwright that can perform emergency work on military ships.",
  "There are a number of privately owned ship construction platforms in the area. You find one that has a slot open for some immediate work.",
  "You receive a message from a small refugee convoy, \"Hail. We'd like to help you on your mission but don't have much to offer. If you have extra metal perhaps we could work on your ship?\"",
  'You are immediately hailed by a mobile docking platform upon arrival, "Welcome to Uncle Joe\'s Fix-it Shop! Need a tune-up? We got you covered!"',
];

/**
 * Crew hiring station. "The intro text for this event varies, and could be any of the following".
 * Three texts and no odds. INFERRED: equal.
 * The hire prices grant an unnamed crewmember and stay off this card.
 */
const HIRE_INTROS = [
  "This Beacon seems to serve as meeting place for local traffic. It seems you can find crew willing to fight on your ship here... for a price.",
  "You find a space station set up for travelers. Browsing through its listings, you find a tavern full of mercenaries for hire. You look for potential crewmembers.",
  "There are a number of ships stationed around a rest stop. You immediately receive a message saying, \"If you're looking for some bodies to fill your ship, you've come to the right place!\"",
];

const SUPPLY_INTROS = [
  "\"You look like a military vessel. We're trying to get back to our homes alive. I'm an engineer by trade and could try to improve your reactor if you have any extra supplies.\"",
  "You receive a message from a small convoy. They're looking for some military supplies and are offering to try to improve your reactor in exchange.",
];

// Abandoned station. The page prints three opening intros and no odds.
// INFERRED: equal. Examine and stay stay the existing choices.
const ABANDONED_STATION_INTROS = [
  "You arrive to find what appears to be a colonized moon, however scans show it has been abandoned. You also detect an abandoned space station near the Beacon.",
  "You find a small space station that appears to be abandoned.",
  "This area shows signs of a battle some time ago. There are scattered remains of ships but one station appears to be intact.",
];

// Rebel fight chance. The page prints four opening intros and no odds.
// INFERRED: equal. The search, the jump, and the two scans stay the existing choices.
const REBEL_CHANCE_INTROS = [
  'You arrive at a beacon located in a civilian star system. A nearby colony contacts you: "We\'ve got a rogue Rebel ship harassing this system. Do you have time to find it?"',
  'As soon as you arrive, you receive a Federation encrypted message: "A Rebel ship has been terrorizing the local civilians in this system, please seek and destroy it."',
  "You begin charging your FTL drive, and do a quick scan of a local planet. You find the ruins of a recently destroyed federation colony on the surface. There must be a Rebel ship in the vicinity...",
  'You jump into a field of debris. It appears a battle recently took place here, and the loser seems to have been a civilian ship. A message was left on repeat before it was destroyed: "Rebels attacking, please send aid!" The responsible Rebels are likely still nearby.',
];

// Battlefield wreckage. The page prints two opening intros and no odds.
// INFERRED: equal. Investigate, ignore, and the sensors scan stay the existing choices.
const WRECKAGE_INTROS = [
  "What at first seems to be a simple nebula is actually filled with a good amount of debris from a brutal exchange between several ships. Wreckage drifts by your screens and tumbles into the depths of the nebula to be lost to sight. It's hard to determine who the combatants were without closer investigation.",
  "You have jumped into the aftermath of what seems to have been a brutal exchange between several ships. Wreckage drifts by your screens, and you can still see the remains of the dying ships sparking and breaking apart. It's hard to determine who the combatants were without closer investigation.",
];

const ENGI_GIFT_INTROS = [
  'An Engi vessel hails you. "Identity: Federation? Outlier probability. Implies... revival. Implies... hope. Assistance suggested." They offer some supplies.',
  "You cross paths with an Engi cargo vessel hurrying home before the Mantis fleets attempt to take over this sector. They're happy to offload some of their cargo to get home faster.",
  "You make contact with an isolated Engi science station who are staying put despite the likelihood of Mantis invasion. They suggest you trial some experimental technology.",
  "This was the site of a recent battle. Either a show of Mantis force, or the Engi here weren't disposed to go peacefully. You pick through the pieces.",
];

const LAST_STAND_INTROS = [
  "Although this sector is still under Federation control, a small scout has slipped by the fleet. You move in to engage.",
  "Long range scanners show this system is empty of any capital ships. Clearly it is not of strategic value. Wait... FTL signatures show a Rebel scout just jumped nearby!",
  "Sensors indicate that the Rebels are setting up a forward Jump Beacon behind the nearby planet's moon. More importantly, a number of ships are passing by; prepare for a fight!",
  "Federation ships are scarce in this region of space despite a number of civilian space stations. You see a small bomber squadron engaged with some Federation scouts and quickly move in to assist.",
  "As soon as you arrive at the beacon, a Rebel scout turns to engage. Power up the weapons!",
  "You scan the area, finding signatures for only a small trade vessel. However, as it approaches you see the silhouette of a Rebel scout! You run the scanners again and discover their registration is fake. You move in to attack.",
];

const TRADER_OFF = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[No fuel: fuel trader (distress off)]]
  // > "A merchant ship jumps into the sector and you quickly hail them asking for help. They respond, \"Perhaps we could work out an exchange...\"" — [[No fuel: fuel trader (distress off)]]
  // > "A number of ships pass through the sector. You relay your message to each, and one finally responds. \"I can't help much right now but perhaps we can trade.\"" — [[No fuel: fuel trader (distress off)]]
  // > "A nearby settlement sends a small ship in your direction. It keeps its distance and hails you, \"We can give you fuel for a price. Just don't even think of doing anything rash. We've got a teleporter at our base and a squad ready to defend us." — [[No fuel: fuel trader (distress off)]]
  // > "A large caravan of merchant ships jumps to a location near your position. Sensing an opportunity, one ship breaks off from the fleet to offer you an exchange." — [[No fuel: fuel trader (distress off)]]
  // > "A modified YT-1300 freighter jumps to an area near your sector. Your gut tells you these people are smugglers, but they seem to be feeling altruistic and present an offer of assistance." — [[No fuel: fuel trader (distress off)]]
  'A merchant ship jumps into the sector and you quickly hail them asking for help. They respond, "Perhaps we could work out an exchange..."',
  'A number of ships pass through the sector. You relay your message to each, and one finally responds. "I can\'t help much right now but perhaps we can trade."',
  "A nearby settlement sends a small ship in your direction. It keeps its distance and hails you, \"We can give you fuel for a price. Just don't even think of doing anything rash. We've got a teleporter at our base and a squad ready to defend us.\"",
  "A large caravan of merchant ships jumps to a location near your position. Sensing an opportunity, one ship breaks off from the fleet to offer you an exchange.",
  "A modified YT-1300 freighter jumps to an area near your sector. Your gut tells you these people are smugglers, but they seem to be feeling altruistic and present an offer of assistance.",
];

const TRADER_ON = [
  // Wiki citations:
  // > "The intro text for this event varies, and could be any of the following:" — [[No fuel: fuel trader (distress on)]]
  // > "A merchant ship jumps into the sector, obviously responding to your ship's distress beacon. They hail you offering a trade for fuel." — [[No fuel: fuel trader (distress on)]]
  // > "A ship arrives at the beacon. \"We noticed your distress signal. I assume you're out of fuel? We're a bit low ourselves but perhaps we can make a trade.\"" — [[No fuel: fuel trader (distress on)]]
  // > "A ship traveling near the beacon approaches your ship and hails you. \"Out of fuel? This is a good opportunity for both of us... Care to trade?\"" — [[No fuel: fuel trader (distress on)]]
  // > "A mercenary ship arrives at the beacon. \"We have a bit of extra fuel we can give you... for a price.\"" — [[No fuel: fuel trader (distress on)]]
  "A merchant ship jumps into the sector, obviously responding to your ship's distress beacon. They hail you offering a trade for fuel.",
  "A ship arrives at the beacon. \"We noticed your distress signal. I assume you're out of fuel? We're a bit low ourselves but perhaps we can make a trade.\"",
  'A ship traveling near the beacon approaches your ship and hails you. "Out of fuel? This is a good opportunity for both of us... Care to trade?"',
  'A mercenary ship arrives at the beacon. "We have a bit of extra fuel we can give you... for a price."',
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
