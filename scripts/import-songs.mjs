// One-off: imports the Echoes of Severance session playlist into the Music
// section, resolving YouTube titles to links via search.
import Database from 'better-sqlite3';
import path from 'node:path';

const SONGS = [
	// name, group, search query (or direct url)
	["Remy's part — Moonlight Over Baldur's Gate", 'Places', 'Moonlight Over Baldur’s Gate Peaceful Fantasy City Music Sleep Study DnD'],
	['Applesby (Jack & Remy) — Peaceful Village', 'Places', 'Peaceful Village D&D TTRPG Music 1 Hour'],
	["Org's introduction — FMA Brothers (instrumental)", 'Themes', 'Full Metal Alchemist Brothers Instrumental'],
	['Generic fight 1 — Low Level Combat', 'Combat', 'Low Level Combat D&D TTRPG Battle Combat Fight Music 1 Hour copyright free'],
	['Generic fight 2 — Forest Skirmish', 'Combat', 'Low Intensity Combat Music Forest Skirmish Tabletop RPG D&D Background Music 1 Hour Loop'],
	["Sergei's introduction", 'Themes', { url: 'https://www.youtube.com/watch?v=ULXEkVrK7zU' }],
	['Ithrion theme — Dirtmouth (Hollow Knight piano)', 'Themes', 'Dirtmouth From Hollow Knight Piano Cover'],
	["Butterpond's theme — Time Flows Ever Onward (Frieren piano)", 'Themes', 'Most Soothing Frieren OST Time Flows Ever Onward Piano Cover'],
	['Butterpond ambience — Medieval City', 'Places', 'Medieval City Realistic Ambience 1 Hour dnd'],
	['Dead air (neutral) — The Vagabond (Witcher 3)', 'Ambience', 'Witcher 3 Wild Hunt The Vagabond Music Extended'],
	['Gino battle — My Own Summer (instrumental)', 'Combat', 'Deftones My Own Summer Shove It Instrumental'],
	['The Poccothecary — Atlasdam (Octopath)', 'Places', 'Octopath Traveler OST Atlasdam Seat of Learning HQ'],
	['Fairysorrow — The First Layer (Made in Abyss)', 'Places', 'Made in Abyss OST 2 The First Layer'],
	['Pocco — Fungal Wastes (Hollow Knight)', 'Themes', 'Hollow Knight OST Fungal Wastes'],
	["Jerry's house — Echo In The Wind (slowed + rain)", 'Places', 'Aaron Cherof Echo In The Wind Slowed Rain'],
	['Fairysorrow battle — Metal Gleamed in the Twilight', 'Combat', 'Child of Light OST Metal Gleamed in the Twilight'],
	['Ruben battle — The Final Combat (Darkest Dungeon)', 'Combat', 'Darkest Dungeon OST The Final Combat'],
	['Hanezeve Caradhina (instrumental)', 'Ambience', 'Hanezeve Caradhina Takeshi Saito Instrumental Version'],
	['Ruben farm — Grandma & Destruction (NieR)', 'Places', 'NieR Grandma Destruction']
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolve(query) {
	const res = await fetch(
		`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
		{
			headers: {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
				Cookie: 'CONSENT=YES+1; SOCS=CAI'
			}
		}
	);
	const html = await res.text();
	const id = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/)?.[1];
	return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

const db = new Database(path.join('data', 'nilbot.db'));
db.pragma('journal_mode = WAL');
const user = db.prepare(`SELECT id FROM users WHERE username = 'denis'`).get();
if (!user) {
	console.error('User denis not found.');
	process.exit(1);
}
const exists = db.prepare('SELECT 1 FROM songs WHERE user_id = ? AND name = ?');
const insert = db.prepare('INSERT INTO songs (user_id, name, grp, url) VALUES (?, ?, ?, ?)');

let ok = 0;
let failed = 0;
for (const [name, grp, q] of SONGS) {
	if (exists.get(user.id, name)) {
		console.log(`skip (exists): ${name}`);
		continue;
	}
	try {
		const url = typeof q === 'object' ? q.url : await resolve(q);
		if (!url) throw new Error('no result');
		insert.run(user.id, name, grp, url);
		console.log(`✓ ${name}\n    ${url}`);
		ok++;
	} catch (e) {
		console.log(`✗ ${name} (${e.message})`);
		failed++;
	}
	await sleep(2500);
}
console.log(`\nDone: ${ok} added, ${failed} failed.`);
