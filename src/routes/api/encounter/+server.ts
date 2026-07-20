import { json } from '@sveltejs/kit';
import { suggestEncounters } from '$lib/server/encounter';

export async function POST({ request, locals }) {
	const { text, partyLevel, partySize } = await request.json();
	if (!text || !String(text).trim()) {
		return json({ error: 'No notes text provided.' }, { status: 400 });
	}
	try {
		const encounters = await suggestEncounters(
			String(text),
			Number(partyLevel) || 3,
			Number(partySize) || 4,
			locals.user!.id
		);
		return json({ encounters });
	} catch (e) {
		console.error('encounter suggestion failed:', e);
		return json(
			{ error: 'LLM call failed. Is the `claude` CLI installed and logged in?' },
			{ status: 500 }
		);
	}
}
