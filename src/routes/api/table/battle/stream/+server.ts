import { seatOf } from '$lib/server/seat';
import { publishedBattle } from '$lib/server/battle';

// Server-Sent Events for the player's seat: the DM's published battle,
// live — token moves, publishes and unpublishes all arrive as they happen.
export async function GET({ locals }) {
	const seat = seatOf(locals.user!.id);
	const encoder = new TextEncoder();

	let watcher: ReturnType<typeof setInterval>;
	let heartbeat: ReturnType<typeof setInterval>;

	const snapshot = () => JSON.stringify(publishedBattle(seat.dmId) ?? { none: true });

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
