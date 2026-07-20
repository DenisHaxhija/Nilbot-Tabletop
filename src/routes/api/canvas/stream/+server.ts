import { db } from '$lib/server/db';

// Server-Sent Events: pushes the current canvas cast whenever it changes.
export async function GET({ locals }) {
	const uid = locals.user!.id;
	const encoder = new TextEncoder();

	let watcher: ReturnType<typeof setInterval>;
	let heartbeat: ReturnType<typeof setInterval>;

	const snapshot = () =>
		JSON.stringify(
			(
				db
					.prepare(
						'SELECT id, name, title, file FROM characters WHERE user_id = ? AND on_canvas = 1 ORDER BY name'
					)
					.all(uid) as { id: number; name: string; title: string; file: string | null }[]
			).map((c) => ({
				id: c.id,
				name: c.name,
				title: c.title,
				img: c.file ? `/api/characters/${c.id}` : null
			}))
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
			watcher = setInterval(check, 400);
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
