import { redirect } from '@sveltejs/kit';

// Old per-page URLs land in the three-pane workspace.
export function load({ params }) {
	redirect(307, `/journal?p=${params.id}`);
}
