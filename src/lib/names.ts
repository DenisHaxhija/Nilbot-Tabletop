// Syllable-based fantasy name generation, per culture. Runs entirely client-side.

type Parts = { first: string[]; mid?: string[]; last: string[]; surnameA?: string[]; surnameB?: string[] };

const CULTURES: Record<string, Parts> = {
	Human: {
		first: ['Al', 'Ber', 'Cal', 'Dor', 'Ed', 'Fen', 'Gar', 'Hal', 'Jor', 'Kel', 'Lan', 'Mar', 'Ned', 'Os', 'Per', 'Rod', 'Ser', 'Tom', 'Wil', 'Yor'],
		mid: ['a', 'e', 'i', 'o', 'u', 'ar', 'en', 'or', 'is'],
		last: ['an', 'bert', 'den', 'fred', 'gan', 'ic', 'lan', 'mund', 'nard', 'ric', 'ton', 'vin', 'wick', 'win'],
		surnameA: ['Black', 'Bright', 'Iron', 'Oak', 'Raven', 'Stone', 'Storm', 'Swift', 'Thorn', 'White', 'Wolf', 'Ash', 'Gold', 'Grey'],
		surnameB: ['brook', 'field', 'ford', 'hart', 'hill', 'mane', 'ridge', 'shield', 'smith', 'song', 'wood', 'water', 'wall', 'born']
	},
	Elf: {
		first: ['Ael', 'Aer', 'Cael', 'Eil', 'Fae', 'Gal', 'Il', 'Lael', 'Lu', 'Myr', 'Nae', 'Quel', 'Sil', 'Thal', 'Vael', 'Yl'],
		mid: ['a', 'ae', 'e', 'ia', 'io', 'y', 'ara', 'ele', 'ithi'],
		last: ['dil', 'dor', 'las', 'lian', 'mir', 'nor', 'rian', 'riel', 'thas', 'thil', 'vyr', 'wen', 'wyn', 'zair'],
		surnameA: ['Moon', 'Star', 'Silver', 'Dawn', 'Dusk', 'Wind', 'Leaf', 'Sun', 'Night', 'Mist'],
		surnameB: ['whisper', 'shadow', 'song', 'blade', 'weaver', 'runner', 'gazer', 'petal', 'brook', 'bloom']
	},
	Dwarf: {
		first: ['Bal', 'Bof', 'Dain', 'Dur', 'Gim', 'Grun', 'Har', 'Kaz', 'Kil', 'Mor', 'Nor', 'Ov', 'Thra', 'Thor', 'Tor', 'Vond'],
		mid: ['a', 'i', 'o', 'u', 'ar', 'ur', 'ig'],
		last: ['bek', 'din', 'dur', 'gar', 'grim', 'in', 'li', 'nar', 'nik', 'rak', 'rin', 'run', 'thur', 'zad'],
		surnameA: ['Anvil', 'Battle', 'Copper', 'Deep', 'Fire', 'Granite', 'Hammer', 'Iron', 'Mithril', 'Rune', 'Steel', 'Stout'],
		surnameB: ['beard', 'brand', 'breaker', 'delver', 'fist', 'forge', 'guard', 'helm', 'hewer', 'shield', 'stone', 'axe']
	},
	Halfling: {
		first: ['An', 'Bil', 'Cor', 'Dro', 'Fil', 'Fro', 'Lil', 'Mer', 'Milo', 'Ned', 'Per', 'Pip', 'Ros', 'Sam', 'Til', 'Wen'],
		mid: ['a', 'o', 'i', 'do', 'ry'],
		last: ['bo', 'doc', 'drin', 'gar', 'go', 'la', 'lie', 'pin', 'po', 'ry', 'to', 'wise'],
		surnameA: ['Apple', 'Butter', 'Cherry', 'Good', 'Green', 'High', 'Honey', 'Puddle', 'Tea', 'Under', 'Warm', 'Whit'],
		surnameB: ['barrel', 'bottom', 'burrow', 'cheeks', 'foot', 'gather', 'hill', 'kettle', 'leaf', 'meadow', 'pipe', 'toes']
	},
	Orc: {
		first: ['Az', 'Bru', 'Dur', 'Gash', 'Ghor', 'Grish', 'Karg', 'Krag', 'Lug', 'Mog', 'Nar', 'Rok', 'Shag', 'Thok', 'Ur', 'Zug'],
		mid: ['a', 'o', 'u', 'ga', 'ro', 'zu'],
		last: ['bash', 'dor', 'gak', 'gar', 'grat', 'k', 'mak', 'nak', 'rag', 'rok', 'th', 'tusk', 'zag', 'zob'],
		surnameA: ['Bone', 'Blood', 'Skull', 'Iron', 'Black', 'Doom', 'Rage', 'War', 'Gut', 'Fang'],
		surnameB: ['crusher', 'render', 'chewer', 'splitter', 'stomper', 'taker', 'howler', 'breaker', 'ripper', 'biter']
	},
	Tiefling: {
		first: ['Ak', 'Bar', 'Dam', 'Ekh', 'Kai', 'Lev', 'Mal', 'Mor', 'Nem', 'Rak', 'Sar', 'Val', 'Xar', 'Zar', 'Zeth'],
		mid: ['a', 'e', 'i', 'ai', 'ora', 'eri'],
		last: ['akos', 'ai', 'dos', 'ius', 'kar', 'lech', 'menos', 'mon', 'ne', 'rai', 'ros', 'thys', 'xis', 'zire'],
		surnameA: ['Ash', 'Cinder', 'Dark', 'Dread', 'Ember', 'Grim', 'Hell', 'Night', 'Shadow', 'Void'],
		surnameB: ['born', 'brand', 'call', 'fell', 'flame', 'mark', 'spark', 'vow', 'walker', 'whisper']
	},
	Dragonborn: {
		first: ['Ar', 'Bala', 'Dor', 'Ghesh', 'Hesk', 'Kriv', 'Med', 'Nala', 'Pand', 'Rho', 'Shed', 'Tar', 'Torinn', 'Vor', 'Zed'],
		mid: ['a', 'e', 'i', 'ra', 'ka', 'sha'],
		last: ['gar', 'hun', 'jed', 'kan', 'rash', 'rek', 'rin', 'sar', 'thar', 'xan', 'yrn', 'zir'],
		surnameA: ['Clan Clethtinthiallor', 'Clan Daardendrian', 'Clan Kepeshkmolik', 'Clan Kerrhylon', 'Clan Myastan', 'Clan Norixius', 'Clan Ophinshtalajiir', 'Clan Shestendeliath', 'Clan Turnuroth', 'Clan Verthisathurgiesh'],
		surnameB: ['']
	},
	Gnome: {
		first: ['Alv', 'Bod', 'Dim', 'El', 'Fon', 'Gim', 'Jeb', 'Nam', 'Nim', 'Or', 'Pog', 'Quin', 'Sin', 'Wren', 'Zook'],
		mid: ['a', 'e', 'i', 'o', 'ble', 'kin', 'dle'],
		last: ['ble', 'bin', 'dook', 'gen', 'kink', 'nan', 'nock', 'ryn', 'tock', 'tin', 'ver', 'wick'],
		surnameA: ['Copper', 'Fizz', 'Gear', 'Glim', 'Spark', 'Timber', 'Tinker', 'Whistle', 'Widget', 'Wobble'],
		surnameB: ['bang', 'bonk', 'cog', 'fizzle', 'gadget', 'spring', 'sprocket', 'top', 'whirl', 'wrench']
	}
};

const TAVERN_A = ['The Prancing', 'The Drunken', 'The Rusty', 'The Golden', 'The Laughing', 'The Sleeping', 'The Wandering', 'The Broken', 'The Salty', 'The Gilded', 'The Crooked', 'The Whistling', 'The Bold', 'The Grumpy', 'The Silver'];
const TAVERN_B = ['Pony', 'Dragon', 'Anchor', 'Griffin', 'Goblin', 'Giant', 'Minstrel', 'Tankard', 'Siren', 'Rose', 'Lantern', 'Boar', 'Badger', 'Wizard', 'Kettle', 'Stag'];

const PLACE_A = ['Aber', 'Bel', 'Crag', 'Dun', 'Ever', 'Fair', 'Glen', 'Hearth', 'Iron', "King's ", 'Mist', 'North', 'Oak', 'Raven', 'Stone', 'Winter'];
const PLACE_B = ['brook', 'crest', 'dale', 'fall', 'ford', 'garde', 'haven', 'helm', 'hollow', 'march', 'mere', 'moor', 'reach', 'shire', 'vale', 'watch'];

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

export const cultures = Object.keys(CULTURES);

export function generateName(culture: string): string {
	const p = CULTURES[culture] ?? CULTURES.Human;
	const useMid = p.mid && Math.random() < 0.55;
	const given = pick(p.first) + (useMid ? pick(p.mid!) : '') + pick(p.last);
	if (p.surnameA) {
		const b = p.surnameB && p.surnameB[0] !== '' ? pick(p.surnameB) : '';
		const surname = pick(p.surnameA) + b;
		return `${given} ${surname}`;
	}
	return given;
}

export function generateTavern(): string {
	return `${pick(TAVERN_A)} ${pick(TAVERN_B)}`;
}

export function generatePlace(): string {
	return pick(PLACE_A) + pick(PLACE_B);
}
