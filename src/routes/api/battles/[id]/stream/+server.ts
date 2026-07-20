import { db } from '$lib/server/db';

// Server-Sent Events: pushes the battle's map layout whenever it changes.
// The Battle Ready view subscribes to this for live updates.
export async function GET({ params, locals }) {
	const uid = locals.user!.id;
	const id = Number(params.id);
	const encoder = new TextEncoder();

	let watcher: ReturnType<typeof setInterval>;
	let heartbeat: ReturnType<typeof setInterval>;

	const stream = new ReadableStream({
		start(controller) {
			let last = '';
			const check = () => {
				try {
					const row = db
						.prepare('SELECT map FROM battles WHERE id = ? AND user_id = ?')
						.get(id, uid) as { map: string | null } | undefined;
					if (!row) {
						controller.close();
						clearInterval(watcher);
						clearInterval(heartbeat);
						return;
					}
					if (row.map && row.map !== last) {
						last = row.map;
						controller.enqueue(encoder.encode(`data: ${row.map}\n\n`));
					}
				} catch {
					// client disconnected mid-enqueue — cancel() will clean up
				}
			};
			check();
			watcher = setInterval(check, 250);
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
