/* Liquid background + 3D glass tilt, shared by the ShiftSync pages. */
(function () {
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = matchMedia('(pointer: fine)').matches;

    /* ---------- liquid background ---------- */
    var canvas = document.getElementById('bg');
    if (canvas) {
        var ctx = canvas.getContext('2d');
        var SCALE = 0.25;
        var W, H, blobs = [], pointer = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35, active: false };

        var cssVar = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
        var palette = function () {
            return {
                colors: [cssVar('--blob-1'), cssVar('--blob-2'), cssVar('--blob-3'), cssVar('--blob-4')],
                cursor: cssVar('--blob-cursor'),
                blend: cssVar('--blob-blend') || 'normal',
                alpha: parseFloat(cssVar('--blob-alpha')) || 0.8
            };
        };
        var pal = palette();
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { pal = palette(); if (reduce) draw(0); });

        var resize = function () {
            var box = canvas.getBoundingClientRect();
            W = canvas.width = Math.max(1, Math.round(box.width * SCALE));
            H = canvas.height = Math.max(1, Math.round(box.height * SCALE));
        };
        var seed = function () {
            blobs = [];
            var seeds = [[0.2, 0.25, 0.32], [0.78, 0.2, 0.36], [0.3, 0.8, 0.34], [0.8, 0.75, 0.3], [0.55, 0.5, 0.26]];
            for (var i = 0; i < seeds.length; i++) {
                blobs.push({
                    x: seeds[i][0], y: seeds[i][1], r: seeds[i][2],
                    ax: 0.06 + Math.random() * 0.06, ay: 0.05 + Math.random() * 0.06,
                    sx: 0.00018 + Math.random() * 0.00012, sy: 0.00015 + Math.random() * 0.00012,
                    px: Math.random() * 6.28, py: Math.random() * 6.28,
                    c: i % 4
                });
            }
        };
        var hexToRgb = function (h) {
            h = h.replace('#', '');
            if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
            var n = parseInt(h, 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        };
        var paint = function (x, y, r, color, alpha) {
            var rgb = hexToRgb(color);
            var g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * Math.max(W, H));
            g.addColorStop(0, 'rgba(' + rgb.join(',') + ',' + alpha + ')');
            g.addColorStop(0.55, 'rgba(' + rgb.join(',') + ',' + (alpha * 0.35) + ')');
            g.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        };
        var draw = function (t) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, W, H);
            ctx.globalCompositeOperation = pal.blend === 'screen' ? 'screen' : 'source-over';
            pointer.x += (pointer.tx - pointer.x) * 0.06;
            pointer.y += (pointer.ty - pointer.y) * 0.06;
            for (var i = 0; i < blobs.length; i++) {
                var b = blobs[i];
                var bx = b.x + Math.sin(t * b.sx + b.px) * b.ax;
                var by = b.y + Math.cos(t * b.sy + b.py) * b.ay;
                var dx = pointer.x - bx, dy = pointer.y - by;
                var d = Math.sqrt(dx * dx + dy * dy) + 0.001;
                var pull = pointer.active ? Math.min(0.18, 0.06 / d) : 0;
                bx += dx * pull; by += dy * pull;
                paint(bx, by, b.r, pal.colors[b.c], pal.alpha);
            }
            paint(pointer.x, pointer.y, 0.22, pal.cursor, pointer.active ? pal.alpha * 0.9 : pal.alpha * 0.5);
        };
        var loop = function (t) { draw(t); requestAnimationFrame(loop); };

        resize(); seed();
        addEventListener('resize', function () { resize(); if (reduce) draw(0); }, { passive: true });
        if (reduce) { draw(0); } else { requestAnimationFrame(loop); }

        var setPointer = function (cx, cy) { pointer.tx = cx / innerWidth; pointer.ty = cy / innerHeight; pointer.active = true; };
        addEventListener('pointermove', function (e) { setPointer(e.clientX, e.clientY); }, { passive: true });
        addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
        document.addEventListener('mouseleave', function () { pointer.active = false; });
        addEventListener('scroll', function () {
            if (fine) return;
            var p = scrollY / Math.max(1, document.body.scrollHeight - innerHeight);
            pointer.tx = 0.5 + Math.sin(p * 6.28) * 0.25; pointer.ty = 0.2 + p * 0.6;
        }, { passive: true });
    }

    /* ---------- 3D glass tilt ---------- */
    if (reduce) return;
    var tiles = document.querySelectorAll('[data-tilt]');
    Array.prototype.forEach.call(tiles, function (tile) {
        var raf = null, target = null;
        var max = parseFloat(tile.getAttribute('data-tilt')) || 14;
        var apply = function () {
            raf = null;
            if (!target) return;
            tile.style.setProperty('--rx', target.rx + 'deg');
            tile.style.setProperty('--ry', target.ry + 'deg');
            tile.style.setProperty('--mx', target.mx + '%');
            tile.style.setProperty('--my', target.my + '%');
        };
        tile.addEventListener('pointermove', function (e) {
            var r = tile.getBoundingClientRect();
            var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
            target = { rx: (0.5 - py) * max, ry: (px - 0.5) * max * 1.15, mx: Math.round(px * 100), my: Math.round(py * 100) };
            tile.classList.add('is-hover');
            if (!raf) raf = requestAnimationFrame(apply);
        });
        tile.addEventListener('pointerleave', function () {
            target = { rx: 0, ry: 0, mx: 50, my: 30 };
            tile.classList.remove('is-hover');
            if (!raf) raf = requestAnimationFrame(apply);
        });
    });

    if (!fine && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
        addEventListener('deviceorientation', function (e) {
            if (e.beta == null || e.gamma == null) return;
            var rx = Math.max(-8, Math.min(8, (e.beta - 40) * -0.2));
            var ry = Math.max(-8, Math.min(8, e.gamma * 0.25));
            Array.prototype.forEach.call(tiles, function (tile) {
                tile.style.setProperty('--rx', rx + 'deg');
                tile.style.setProperty('--ry', ry + 'deg');
            });
        }, { passive: true });
    }
})();
