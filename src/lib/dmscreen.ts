// DM screen quick reference — condensed 5e SRD rules, grouped into tabs.
// Static data only; rendered by the dashboard's DM Screen panel.

export interface ScreenEntry {
	t: string; // term
	d: string; // rule text, one-two lines
}
export interface ScreenGroup {
	title?: string;
	entries: ScreenEntry[];
}
export interface ScreenSection {
	key: string;
	label: string;
	groups: ScreenGroup[];
}

export const DM_SCREEN: ScreenSection[] = [
	{
		key: 'actions',
		label: 'Action economy',
		groups: [
			{
				title: 'Actions',
				entries: [
					{ t: 'Attack', d: 'One melee or ranged attack (Extra Attack lets some make more).' },
					{ t: 'Cast a Spell', d: 'Casting time "1 action". One levelled spell per turn — a bonus-action spell limits you to cantrips for the action.' },
					{ t: 'Dash', d: 'Gain extra movement equal to your speed.' },
					{ t: 'Disengage', d: 'Your movement provokes no opportunity attacks this turn.' },
					{ t: 'Dodge', d: 'Attacks against you have disadvantage; DEX saves at advantage (until incapacitated or speed 0).' },
					{ t: 'Help', d: 'Give an ally advantage on their next check, or on their next attack vs a creature within 5 ft of you.' },
					{ t: 'Hide', d: 'DEX (Stealth) vs passive Perception. Needs cover/obscurement.' },
					{ t: 'Ready', d: 'Choose trigger + action; act with your reaction. Readied spells need concentration to hold.' },
					{ t: 'Search', d: 'WIS (Perception) or INT (Investigation) to find something.' },
					{ t: 'Use an Object', d: 'Interact with a second object (the first per turn is free).' }
				]
			},
			{
				title: 'Everything else',
				entries: [
					{ t: 'Bonus action', d: 'Only if a feature grants one; max one per turn.' },
					{ t: 'Reaction', d: 'One per round, regains at the start of your turn. Opportunity attack: melee attack when an enemy leaves your reach.' },
					{ t: 'Movement', d: 'Split freely around actions. Difficult terrain costs double; crawling +1 ft per ft.' },
					{ t: 'Prone', d: 'Standing up costs half your speed; while prone: melee attacks vs you have advantage, ranged have disadvantage, your attacks have disadvantage.' },
					{ t: 'Grapple / Shove', d: 'Attack action: your Athletics vs their Athletics or Acrobatics. Shove: knock prone or push 5 ft.' },
					{ t: 'Two-weapon fighting', d: 'Bonus action: attack with a second light weapon, no ability mod to damage (unless negative).' }
				]
			}
		]
	},
	{
		key: 'conditions',
		label: 'Conditions',
		groups: [
			{
				entries: [
					{ t: 'Blinded', d: "Can't see, auto-fail sight checks. Attacks vs it have advantage; its attacks have disadvantage." },
					{ t: 'Charmed', d: "Can't attack the charmer; charmer has advantage on social checks vs it." },
					{ t: 'Deafened', d: "Can't hear, auto-fail hearing checks." },
					{ t: 'Frightened', d: 'Disadvantage on checks/attacks while source is in sight; can\'t willingly move closer to it.' },
					{ t: 'Grappled', d: 'Speed 0. Ends if grappler is incapacitated or target is moved out of reach.' },
					{ t: 'Incapacitated', d: "Can't take actions or reactions." },
					{ t: 'Invisible', d: 'Heavily obscured for hiding. Attacks vs it have disadvantage; its attacks have advantage.' },
					{ t: 'Paralyzed', d: 'Incapacitated, can\'t move/speak, auto-fail STR & DEX saves. Attacks vs it have advantage; hits within 5 ft are crits.' },
					{ t: 'Petrified', d: 'Turned to stone, incapacitated, resistance to all damage, immune to poison/disease.' },
					{ t: 'Poisoned', d: 'Disadvantage on attack rolls and ability checks.' },
					{ t: 'Prone', d: 'See action economy tab.' },
					{ t: 'Restrained', d: 'Speed 0. Attacks vs it advantage, its attacks disadvantage, DEX saves disadvantage.' },
					{ t: 'Stunned', d: 'Incapacitated, can\'t move, auto-fail STR & DEX saves. Attacks vs it have advantage.' },
					{ t: 'Unconscious', d: 'As paralyzed + drops what it holds and falls prone.' },
					{ t: 'Exhaustion', d: '1 disadv. checks · 2 speed halved · 3 disadv. attacks/saves · 4 HP max halved · 5 speed 0 · 6 death. Long rest removes one level.' }
				]
			}
		]
	},
	{
		key: 'checks',
		label: 'Checks & DCs',
		groups: [
			{
				title: 'Setting a DC',
				entries: [
					{ t: 'Very easy 5', d: 'Barely an obstacle.' },
					{ t: 'Easy 10', d: 'Most people manage.' },
					{ t: 'Medium 15', d: 'Needs competence.' },
					{ t: 'Hard 20', d: 'Specialists succeed about half the time.' },
					{ t: 'Very hard 25', d: 'Peak mortal effort.' },
					{ t: 'Nearly impossible 30', d: 'Legendary.' }
				]
			},
			{
				title: 'Rolling',
				entries: [
					{ t: 'Advantage / Disadvantage', d: "Roll 2d20, take higher / lower. They don't stack, and one of each cancels to a straight roll." },
					{ t: 'Group check', d: 'Everyone rolls; half or more succeed → group succeeds.' },
					{ t: 'Passive check', d: '10 + modifiers (±5 for adv/disadv).' },
					{ t: 'Contest', d: 'Opposed checks; higher wins, ties keep the status quo.' },
					{ t: 'Working together', d: 'One rolls with advantage — only when help is actually plausible.' }
				]
			},
			{
				title: 'Skills by ability',
				entries: [
					{ t: 'STR', d: 'Athletics' },
					{ t: 'DEX', d: 'Acrobatics, Sleight of Hand, Stealth' },
					{ t: 'INT', d: 'Arcana, History, Investigation, Nature, Religion' },
					{ t: 'WIS', d: 'Animal Handling, Insight, Medicine, Perception, Survival' },
					{ t: 'CHA', d: 'Deception, Intimidation, Performance, Persuasion' }
				]
			}
		]
	},
	{
		key: 'combat',
		label: 'Combat',
		groups: [
			{
				entries: [
					{ t: 'Cover', d: 'Half: +2 AC & DEX saves. Three-quarters: +5. Total: can\'t be targeted directly.' },
					{ t: 'Unseen', d: 'Attacking an unseen target: disadvantage. Attacking while unseen: advantage (and reveals you).' },
					{ t: 'Ranged in melee', d: 'Disadvantage on ranged attacks with a hostile within 5 ft.' },
					{ t: 'Critical hit', d: 'Nat 20: roll all damage dice twice. Nat 1 always misses.' },
					{ t: 'Underwater', d: 'Melee at disadvantage without a piercing weapon; most ranged attacks miss beyond normal range.' },
					{ t: 'Mounted', d: 'Mount acts on your initiative; falling off = DC 10 DEX save or land prone.' },
					{ t: 'Improvised damage', d: 'Setback 1d10 · Dangerous 2d10–4d10 · Deadly 10d10+ (lava, collapse).' },
					{ t: 'Objects', d: 'AC: cloth 11, wood 15, stone 17, metal 19. Fragile things just break.' }
				]
			}
		]
	},
	{
		key: 'health',
		label: 'Health & rest',
		groups: [
			{
				entries: [
					{ t: 'Short rest', d: '1+ hour; spend Hit Dice (roll + CON each).' },
					{ t: 'Long rest', d: '8 hours; all HP, half total Hit Dice back. One per 24h, needs 1 HP to benefit.' },
					{ t: 'Death saves', d: 'DC 10 flat d20 at turn start on 0 HP. 3 fails = death, 3 successes = stable. Nat 1 = two fails; nat 20 = back at 1 HP. Damage at 0 HP = one fail (crit = two).' },
					{ t: 'Stabilize', d: 'DC 10 WIS (Medicine), or any healing. Stable creatures wake with 1 HP after 1d4 hours.' },
					{ t: 'Instant death', d: 'Damage that exceeds the negative of your HP max in one hit kills outright.' },
					{ t: 'Concentration', d: 'One spell at a time. CON save on damage: DC 10 or half the damage, whichever is higher. Broken by incapacitation/death.' },
					{ t: 'Temporary HP', d: "Don't stack — take the higher pool. Can't be healed." },
					{ t: 'Dropping to 0', d: 'Melee can choose to knock out instead of kill.' }
				]
			}
		]
	},
	{
		key: 'environment',
		label: 'Environment',
		groups: [
			{
				entries: [
					{ t: 'Light', d: 'Dim light: disadvantage on Perception (sight). Darkness: heavily obscured — effectively blinded.' },
					{ t: 'Obscured', d: 'Lightly (fog, foliage): disadvantage on sight Perception. Heavily: blocks sight entirely.' },
					{ t: 'Travel pace', d: 'Fast 30 mi/day (−5 passive Perception) · Normal 24 · Slow 18 (can stealth). Forced march: CON save per extra hour or exhaustion.' },
					{ t: 'Jumping', d: 'Long: STR score in ft with 10-ft run-up (half standing). High: 3 + STR mod ft.' },
					{ t: 'Falling', d: '1d6 bludgeoning per 10 ft, max 20d6; land prone.' },
					{ t: 'Suffocating', d: 'Hold breath 1 + CON mod minutes; then CON mod rounds before dropping to 0 HP.' },
					{ t: 'Food & water', d: 'Need 1 lb food / 1 gallon water daily; a day without water (or exceeding half rations) → exhaustion.' },
					{ t: 'Light sources', d: 'Torch 20/40 ft, 1h · Lamp 15/45, 6h · Lantern 30/60, 6h · Candle 5/10, 1h.' }
				]
			}
		]
	}
];
