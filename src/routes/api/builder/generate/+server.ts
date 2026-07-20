import { json } from '@sveltejs/kit';
import { generateSheet } from '$lib/server/builder';

export async function POST({ request }) {
	const { description, current, feedback } = await request.json();
	if (!description?.trim() && !feedback?.trim()) {
		return json({ error: 'Describe the character first.' }, { status: 400 });
	}
	try {
		const sheet = await generateSheet(
			String(description ?? ''),
			current ?? null,
			feedback ? String(feedback) : null
		);
		return json({ sheet });
	} catch (e) {
		console.error('sheet generation failed:', e);
		return json(
			{ error: 'Generation failed. Is the `claude` CLI logged in?' },
			{ status: 500 }
		);
	}
}
