// Converts the OneNote dump (data/onenote-export) into NilBot sessions.
// Pages become session notes (markdown); embedded images are rewritten to the
// authenticated /api/import-assets endpoint so they render in the editor.
// Idempotent: pages already imported (matched by src) are skipped.
//
//   node scripts/import-onenote.mjs [--filter "echoes"] [--user <name>] [--dry]
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';
import { resolveImportUser } from './lib.mjs';

const OUT = path.resolve('data', 'onenote-export');
const manifestPath = path.join(OUT, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
	console.error('No manifest found — run scripts/fetch-onenote.mjs first.');
	process.exit(1);
}

const argv = process.argv;
const filterIdx = argv.indexOf('--filter');
const filter = filterIdx !== -1 ? new RegExp(argv[filterIdx + 1], 'i') : /./;
const dry = argv.includes('--dry');

const db = new Database(path.join('data', 'nilbot.db'));
db.pragma('journal_mode = WAL');
try {
	db.exec(`ALTER TABLE notes ADD COLUMN src TEXT`);
} catch {
	/* column exists */
}
const userId = resolveImportUser(db, argv);
if (!userId) {
	console.error('No account found — create one in the app first.');
	process.exit(1);
}

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
td.keep(['table', 'tr', 'td', 'th']);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const targets = manifest.filter(
	(m) => filter.test(m.notebook ?? '') || filter.test(m.sectionGroup ?? '') || filter.test(m.section ?? '')
);
console.log(`${targets.length}/${manifest.length} pages match the filter.`);

const existing = new Set(
	db.prepare('SELECT src FROM notes WHERE src IS NOT NULL').all().map((r) => r.src)
);
const insert = db.prepare(
	`INSERT INTO notes (title, content, user_id, src, created_at, updated_at)
	 VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')), datetime('now'))`
);

let imported = 0;
let skipped = 0;

for (const m of targets) {
	if (existing.has(m.file)) {
		skipped++;
		continue;
	}
	const htmlPath = path.join(OUT, m.file);
	if (!fs.existsSync(htmlPath)) continue;
	const html = fs.readFileSync(htmlPath, 'utf8');

	let md = td.turndown(html);
	// Rewrite relative asset links to the authenticated serving endpoint.
	const pageDir = path.dirname(m.file);
	md = md.replace(/\((assets\/[^)]+)\)/g, (_, rel) => {
		const full = path.posix.join(...pageDir.split(path.sep).map(encodeURIComponent), rel
			.split('/')
			.map(encodeURIComponent)
			.join('/'));
		return `(/api/import-assets/${full})`;
	});

	const provenance = [m.notebook, m.sectionGroup, m.section].filter(Boolean).join(' / ');
	const content = `> imported from OneNote: ${provenance}\n\n${md.trim()}\n`;
	const title = (m.title || `${m.section} page`).trim();

	if (dry) {
		console.log(`[dry] would import: "${title}" (${provenance}) — ${md.length} chars`);
	} else {
		insert.run(title, content, userId, m.file, m.created ?? null);
	}
	imported++;
}

console.log(
	`${dry ? '[dry run] ' : ''}Imported ${imported} pages as sessions, skipped ${skipped} already present.`
);
