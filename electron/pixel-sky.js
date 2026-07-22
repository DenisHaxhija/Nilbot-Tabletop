// Pixel-art night camp, drawn at 192x108 and upscaled with hard pixels.
// Starry dithered sky, moon, dark hills over a moonlit meadow — and a
// hand-drawn campfire sprite with a sword planted beside it.
(function () {
	const cv = document.getElementById('pixel-bg');
	if (!cv) return;
	const W = 192;
	const H = 108;
	cv.width = W;
	cv.height = H;
	const ctx = cv.getContext('2d');

	const BANDS = ['#0b1026', '#101736', '#162044', '#1c2b52', '#24365e', '#31456e'];
	const HORIZON = 78;

	function skyColor(y, x) {
		const t = (y / HORIZON) * (BANDS.length - 1);
		const i = Math.floor(t);
		const frac = t - i;
		const m = [
			[0.2, 0.8],
			[0.6, 0.4]
		][y % 2][x % 2];
		return BANDS[Math.min(i + (frac > m ? 1 : 0), BANDS.length - 1)];
	}

	function ridge(base, jag) {
		const ys = [];
		let y = base + Math.floor(Math.random() * 4);
		for (let x = 0; x < W; x++) {
			y += Math.floor(Math.random() * 3) - 1;
			if (Math.random() < jag) y += Math.floor(Math.random() * 5) - 2;
			y = Math.max(base - 14, Math.min(base + 8, y));
			ys.push(y);
		}
		return ys;
	}
	const far = ridge(HORIZON - 10, 0.12);
	const near = ridge(HORIZON - 3, 0.2);
	const MEADOW = HORIZON + 10; // meadow starts noticeably lighter than hills

	const stars = Array.from({ length: 54 }, () => ({
		x: Math.floor(Math.random() * W),
		y: Math.floor(Math.random() * (HORIZON * 0.66)),
		big: Math.random() < 0.15,
		blink: Math.random() < 0.45,
		phase: Math.floor(Math.random() * 8)
	}));

	const clouds = Array.from({ length: 5 }, () => ({
		x: Math.random() * W,
		y: 6 + Math.random() * (HORIZON * 0.5),
		w: 16 + Math.floor(Math.random() * 20),
		speed: 0.15 + Math.random() * 0.2
	}));

	const tufts = Array.from({ length: 30 }, () => ({
		x: Math.floor(Math.random() * W),
		y: MEADOW + 2 + Math.floor(Math.random() * (H - MEADOW - 4))
	}));

	const flies = Array.from({ length: 8 }, () => ({
		x: Math.random() * W,
		y: MEADOW + Math.random() * 14,
		phase: Math.floor(Math.random() * 14)
	}));

	let tick = 0;

	// ---- sprites -----------------------------------------------------------

	const PAL = {
		'#': '#9298a6', // stone light
		'=': '#666c7a', // stone shadow
		L: '#7a5233', // log light
		l: '#523620', // log dark
		r: '#e8642c', // flame outer
		o: '#ffa53c', // flame mid
		y: '#ffe98a', // flame inner
		w: '#fff7d6', // flame core
		e: '#b8451c', // embers
		S: '#d4dce8', // blade light
		s: '#8e98ac', // blade shadow
		g: '#d8a548', // gold guard/pommel
		h: '#4a3320' // grip
	};

	function blit(map, ox, oy) {
		for (let y = 0; y < map.length; y++) {
			for (let x = 0; x < map[y].length; x++) {
				const c = PAL[map[y][x]];
				if (c) {
					ctx.fillStyle = c;
					ctx.fillRect(ox + x, oy + y, 1, 1);
				}
			}
		}
	}

	// Crossed logs inside a stone ring, viewed from a low angle.
	const FIRE_BASE = [
		'..l.......l..',
		'...l..L..l...',
		'....llLLl....',
		'..#lLLLLLl#..',
		'.#=.......=#.',
		'.###=====###.',
		'..#########..'
	];

	// Three flame frames — same silhouette family, licking differently.
	const FLAMES = [
		[
			'...r...',
			'...o...',
			'..ro...',
			'..oo r.',
			'.royo..',
			'.oyyyo.',
			'.oywyo.',
			'oyywyyr',
			'.eywye.'
		],
		[
			'..r....',
			'..o.r..',
			'...oo..',
			'.r.yo..',
			'..oyyo.',
			'.oyywo.',
			'roywyo.',
			'.yywyyo',
			'.eywye.'
		],
		[
			'....r..',
			'...o...',
			'..oy...',
			'..oyo..',
			'.oyyor.',
			'.oywyo.',
			'.yywyy.',
			'ryywyyo',
			'.eywye.'
		]
	];

	// Sword planted blade-down beside the fire, catching a little firelight.
	const SWORD = [
		'...g...',
		'..ghg..',
		'...h...',
		'...h...',
		'.ggggg.',
		'...Ss..',
		'...Ss..',
		'...Ss..',
		'...Ss..',
		'...Ss..',
		'...Ss..',
		'...Ss..',
		'....s..'
	];

	const FX = 40; // fire anchor (left edge of base sprite)
	const FY = 90; // fire base top row
	const smoke = [];

	function drawCamp() {
		// lit dirt patch so the camp sits ON the ground
		ctx.fillStyle = '#33261c';
		ctx.fillRect(FX - 4, FY + 5, 22, 4);
		ctx.fillStyle = '#241a12';
		ctx.fillRect(FX - 2, FY + 9, 18, 2);

		// warm glow on the ground, dithered rings
		for (let dy = -2; dy <= 7; dy++) {
			for (let dx = -13; dx <= 25; dx++) {
				const d = Math.abs(dx - 6) / 2.4 + Math.abs(dy - 2);
				if (d < 7 && (dx + dy * 3 + tick) % 2 === 0 && Math.random() < 0.6) {
					ctx.fillStyle = d < 3.4 ? 'rgba(255, 165, 60, 0.30)' : 'rgba(230, 120, 50, 0.13)';
					ctx.fillRect(FX + dx, FY + dy, 1, 1);
				}
			}
		}

		blit(FIRE_BASE, FX, FY);
		blit(FLAMES[tick % 3], FX + 3, FY - 8);
		blit(SWORD, FX + 17, FY - 4);

		// smoke: rises, sways, fades
		if (tick % 2 === 0) smoke.push({ x: FX + 6 + (Math.random() < 0.5 ? -1 : 1), y: FY - 9, age: 0 });
		for (let i = smoke.length - 1; i >= 0; i--) {
			const p = smoke[i];
			p.y -= 1;
			p.x += Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
			p.age++;
			if (p.age > 24 || p.y < 6) {
				smoke.splice(i, 1);
				continue;
			}
			ctx.fillStyle =
				p.age < 8
					? 'rgba(150, 150, 165, 0.7)'
					: p.age < 16
						? 'rgba(170, 175, 190, 0.45)'
						: 'rgba(190, 196, 210, 0.25)';
			ctx.fillRect(p.x, p.y, p.age < 12 ? 1 : 2, 1);
		}
	}

	// ---- scene -------------------------------------------------------------

	function draw() {
		tick++;
		for (let y = 0; y < HORIZON; y++) {
			for (let x = 0; x < W; x++) {
				ctx.fillStyle = skyColor(y, x);
				ctx.fillRect(x, y, 1, 1);
			}
		}
		// moon
		const mx = 156;
		const my = 17;
		ctx.fillStyle = '#e8ebda';
		ctx.fillRect(mx - 5, my - 6, 10, 12);
		ctx.fillRect(mx - 6, my - 5, 12, 10);
		ctx.fillStyle = '#f6f8ec';
		ctx.fillRect(mx - 4, my - 4, 8, 8);
		ctx.fillStyle = '#c9cfc0';
		ctx.fillRect(mx + 1, my - 3, 3, 3);
		ctx.fillRect(mx - 3, my + 2, 2, 2);
		// stars
		for (const st of stars) {
			if (st.blink && (tick + st.phase) % 8 < 2) continue;
			ctx.fillStyle = st.big ? '#fff3d6' : '#aab4de';
			ctx.fillRect(st.x, st.y, 1, 1);
			if (st.big) {
				ctx.fillRect(st.x - 1, st.y, 1, 1);
				ctx.fillRect(st.x + 1, st.y, 1, 1);
				ctx.fillRect(st.x, st.y - 1, 1, 1);
				ctx.fillRect(st.x, st.y + 1, 1, 1);
			}
		}
		// night clouds
		for (const c of clouds) {
			c.x += c.speed;
			if (c.x > W + 26) c.x = -c.w - 10;
			const cx = Math.floor(c.x);
			const cy = Math.floor(c.y);
			ctx.fillStyle = 'rgba(24, 30, 56, 0.9)';
			ctx.fillRect(cx, cy, c.w, 4);
			ctx.fillRect(cx + 4, cy - 3, c.w - 9, 3);
		}

		// distant hills (clearly darker than the meadow in front of them)
		for (let x = 0; x < W; x++) {
			ctx.fillStyle = '#101c2e';
			ctx.fillRect(x, far[x], 1, MEADOW - far[x]);
		}
		for (let x = 0; x < W; x++) {
			ctx.fillStyle = '#0a1420';
			ctx.fillRect(x, near[x], 1, MEADOW - near[x]);
		}
		// moonlit meadow — the green foreground the camp sits on
		ctx.fillStyle = '#1e3c30';
		ctx.fillRect(0, MEADOW, W, H - MEADOW);
		ctx.fillStyle = '#18332a';
		ctx.fillRect(0, MEADOW, W, 2);
		ctx.fillStyle = '#254a3a';
		for (const t of tufts) {
			ctx.fillRect(t.x, t.y, 1, 2);
		}

		drawCamp();

		for (const fl of flies) {
			fl.x += Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0;
			fl.y += Math.random() < 0.25 ? (Math.random() < 0.5 ? -1 : 1) : 0;
			fl.y = Math.max(MEADOW, Math.min(H - 3, fl.y));
			if ((tick + fl.phase) % 14 < 5) {
				ctx.fillStyle = '#d8e87a';
				ctx.fillRect(Math.floor(fl.x), Math.floor(fl.y), 1, 1);
			}
		}
	}
	draw();
	setInterval(draw, 140);
})();
