import { seatOf } from '$lib/server/seat';
import { canvasCast } from '$lib/server/canvas';

// Server-Sent Events for the player's seat: pushes the DM's canvas cast
// whenever it changes — the same masked view the table screen shows.
export async function GET({ locals }) {
	const seat = seatOf(locals.user!.id);
	const encoder = new TextEncoder();

	let watcher: ReturnType<typeof setInterval>;
	let heartbeat: ReturnType<typeof setInterval>;

	const snapshot = () => JSON.stringify(canvasCast(seat.dmId, '/api/table/chars'));

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
