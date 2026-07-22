import { redirect, json, type Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';

export const COOKIE = 'nilbot_session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = validateSession(event.cookies.get(COOKIE));

	const path = event.url.pathname;
	// /api/join is the invite handshake — reachable before any session exists.
	const isPublic = path === '/login' || path.startsWith('/login/') || path === '/api/join';

	if (!event.locals.user && !isPublic) {
		if (path.startsWith('/api/')) {
			return json({ error: 'Not logged in.' }, { status: 401 });
		}
		redirect(303, '/login');
	}
	if (event.locals.user && isPublic && path !== '/api/join') {
		redirect(303, event.locals.user.role === 'player' ? '/table' : '/');
	}
	// Joined players see the table and nothing else of the DM's world.
	if (
		event.locals.user?.role === 'player' &&
		!isPublic &&
		!path.startsWith('/table') &&
		!path.startsWith('/api/table')
	) {
		if (path.startsWith('/api/')) {
			return json({ error: 'Players sit at the table.' }, { status: 403 });
		}
		redirect(303, '/table');
	}

	return resolve(event);
};
