import { fail, redirect } from '@sveltejs/kit';
import { userExists, createUser, verifyLogin, createSession } from '$lib/server/auth';
import { setSetting } from '$lib/server/db';
import { COOKIE } from '../../hooks.server';

export function load() {
	return { firstRun: !userExists() };
}

function setCookie(cookies: import('@sveltejs/kit').Cookies, userId: number) {
	const { token, expires } = createSession(userId);
	cookies.set(COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false, // local app served over http
		expires
	});
}

export const actions = {
	setup: async ({ request, cookies }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		if (username.length < 2) return fail(400, { error: 'Pick a name (2+ characters).' });
		if (password.length < 6) return fail(400, { error: 'Password needs at least 6 characters.' });
		if (password !== confirm) return fail(400, { error: "Passwords don't match." });
		try {
			const user = createUser(username, password);
			setSetting(user.id, 'dm_name', username);
			setCookie(cookies, user.id);
		} catch {
			return fail(400, { error: 'That name is taken.' });
		}
		redirect(303, '/');
	},
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const user = verifyLogin(username, password);
		if (!user) return fail(400, { error: 'Wrong name or password.' });
		setCookie(cookies, user.id);
		redirect(303, '/');
	}
};
