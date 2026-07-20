import { redirect, json, type Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';

export const COOKIE = 'nilbot_session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = validateSession(event.cookies.get(COOKIE));

	const path = event.url.pathname;
	const isPublic = path === '/login' || path.startsWith('/login/');

	if (!event.locals.user && !isPublic) {
		if (path.startsWith('/api/')) {
			return json({ error: 'Not logged in.' }, { status: 401 });
		}
		redirect(303, '/login');
	}
	if (event.locals.user && isPublic) {
		redirect(303, '/');
	}

	return resolve(event);
};
