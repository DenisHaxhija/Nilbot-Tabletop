import { db } from '$lib/server/db';

// Server-Sent Events: pushes the stocked shop whenever it changes.
export async function GET({ locals }) {
	const uid = locals.user!.id;
	const encoder = new TextEncoder();

	let watcher: ReturnType<typeof setInterval>;
	let heartbeat: ReturnType<typeof setInterval>;

	const snapshot = () =>
		JSON.stringify(
			db
				.prepare(
					`SELECT i.id, i.name, i.type, i.rarity, i.attunement, s.price
					 FROM shop_stock s JOIN items i ON i.id = s.item_id
					 WHERE s.user_id = ? ORDER BY i.name`
				)
				.all(uid)
		);

	const stream = new ReadableStream({
		start(controller) {
			let last = '';
			const check = () => {
				try {
					const now = snapshot();
					if (now !== last) {
						last = now;
						controller.enqueue(encoder.encode(`data: ${now}\n\n`));
					}
				} catch {
					clearInterval(watcher);
					clearInterval(heartbeat);
				}
			};
			check();
			watcher = setInterval(check, 500);
			heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: ping\n\n`));
				} catch {
					clearInterval(watcher);
					clearInterval(heartbeat);
				}
			}, 15000);
		},
		cancel() {
			clearInterval(watcher);
			clearInterval(heartbeat);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-store',
			Connection: 'keep-alive'
		}
	});
}
