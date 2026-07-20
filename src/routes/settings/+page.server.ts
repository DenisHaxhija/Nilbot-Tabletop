import { fail, redirect } from '@sveltejs/kit';
import { getSetting, setSetting } from '$lib/server/db';
import { changePassword, verifyLogin, deleteSession } from '$lib/server/auth';
import { COOKIE } from '../../hooks.server';

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
	},
	password: async ({ request, locals }) => {
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		if (!verifyLogin(locals.user!.username, current)) {
			return fail(400, { password: 'Current password is wrong.' });
		}
		if (next.length < 6) return fail(400, { password: 'New password needs 6+ characters.' });
		if (next !== confirm) return fail(400, { password: "New passwords don't match." });
		changePassword(locals.user!.id, next);
		redirect(303, '/login');
	},
	logout: async ({ cookies }) => {
		deleteSession(cookies.get(COOKIE));
		cookies.delete(COOKIE, { path: '/' });
		redirect(303, '/login');
	}
};
