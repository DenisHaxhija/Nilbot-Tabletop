import { fail } from '@sveltejs/kit';
import { getSetting, setSetting } from '$lib/server/db';

// Tabletop: no logout/password actions (identity belongs to the shell) and
// no storage quota (local worlds are bounded by the disk, not a cap).
export function load({ locals }) {
	const uid = locals.user!.id;
	return {
		username: locals.user!.username,
		settings: {
			dm_name: getSetting(uid, 'dm_name', locals.user!.username),
			party_level: Number(getSetting(uid, 'party_level', '3')),
			party_size: Number(getSetting(uid, 'party_size', '4'))
		}
	};
}

export const actions = {
	general: async ({ request, locals }) => {
		const uid = locals.user!.id;
		const form = await request.formData();
		const dmName = String(form.get('dm_name') ?? '').trim();
		const level = Math.min(20, Math.max(1, Number(form.get('party_level')) || 3));
		const size = Math.min(10, Math.max(1, Number(form.get('party_size')) || 4));
		if (!dmName) return fail(400, { general: 'DM name cannot be empty.' });
		setSetting(uid, 'dm_name', dmName);
		setSetting(uid, 'party_level', String(level));
		setSetting(uid, 'party_size', String(size));
		return { generalSaved: true };
	}
};
