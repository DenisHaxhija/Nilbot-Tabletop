import { canvasCast } from '$lib/server/canvas';

export function load({ locals }) {
	return { cast: canvasCast(locals.user!.id, '/api/characters') };
}
