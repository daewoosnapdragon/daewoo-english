"""The class flowers: Gemini line drawings -> ordered centre-line paths.

Usage: python3 scripts/brand/vectorize.py scripts/brand/source src/components/brand/flowers.json
Then: python3 scripts/brand/to_ts.py
Needs scikit-image and scipy. Paths are in a shared 760 x 760 frame, in drawing order
(from the bottom of the stem up), so a flower can be drawn as one continuous pen line.
`head` is a square around the flower head; `bot` is where the head ends and the stem begins."""
import sys, json, math
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize
from scipy import ndimage

BASE = sys.argv[1]
FILES = {n: f'{n}.png' for n in ['lily', 'camellia', 'daisy', 'sunflower', 'marigold', 'snapdragon']}
CROP = (132, 131, 892, 891)  # one shared frame, 760 px square
N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a; L = np.hypot(*ab)
    P = np.array(pts, float)
    d = np.abs(ab[0] * (P[:, 1] - a[1]) - ab[1] * (P[:, 0] - a[0])) / L if L > 0 else np.hypot(*(P - a).T)
    i = int(np.argmax(d))
    if d[i] > eps: return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]

def plen(p): return sum(math.dist(p[i], p[i + 1]) for i in range(len(p) - 1))

def vectorize(name):
    im = Image.open(f'{BASE}/{FILES[name]}').convert('L')
    if im.size != (1024, 1024): im = im.resize((1024, 1024))
    g = np.array(im.crop(CROP))
    ink = g < 150
    ink = ndimage.binary_closing(ink, iterations=1)
    sk = skeletonize(ink)
    H, W = sk.shape
    pad = np.pad(sk, 1)
    deg = sum(np.roll(np.roll(pad, dy, 0), dx, 1) for dy, dx in N8)[1:-1, 1:-1] * sk
    node = sk & (deg != 2)
    lab, nlab = ndimage.label(node, structure=np.ones((3, 3)))
    nb = lambda y, x: [(y + dy, x + dx) for dy, dx in N8 if 0 <= y + dy < H and 0 <= x + dx < W and sk[y + dy, x + dx]]
    seen_edge, segs = set(), []
    def walk(a, b):
        path = [a, b]; prev, cur = a, b
        seen_edge.add((a, b)); seen_edge.add((b, a))
        while not node[cur]:
            nxt = [q for q in nb(*cur) if q != prev and (cur, q) not in seen_edge]
            if not nxt: break
            q = nxt[0]; seen_edge.add((cur, q)); seen_edge.add((q, cur))
            path.append(q); prev, cur = cur, q
            if q == path[0]: break
        return path
    ys, xs = np.where(node)
    for y, x in zip(ys, xs):
        for q in nb(y, x):
            if ((y, x), q) in seen_edge: continue
            if node[q] and lab[q] == lab[y, x]: seen_edge.add(((y, x), q)); seen_edge.add((q, (y, x))); continue
            segs.append(walk((y, x), q))
    # closed loops with no node
    used = np.zeros_like(sk)
    for s in segs:
        for p in s: used[p] = True
    rest = sk & ~used & ~node
    while rest.any():
        y, x = map(int, np.argwhere(rest)[0])
        path = [(y, x)]; prev = None; cur = (y, x)
        while True:
            nxt = [q for q in nb(*cur) if q != prev and rest[q] and q not in path[-3:]]
            if not nxt: break
            prev, cur = cur, nxt[0]
            if cur == path[0]: path.append(cur); break
            path.append(cur); rest[cur] = False
        rest[y, x] = False
        segs.append(path)
    # dots: tiny components
    dots = []
    clab, nc = ndimage.label(ink, structure=np.ones((3, 3)))
    for i in range(1, nc + 1):
        m = clab == i
        if m.sum() < 140:
            cy, cx = ndimage.center_of_mass(m); dots.append([round(float(cx), 1), round(float(cy), 1), round(float(max(2.2, math.sqrt(m.sum() / math.pi))), 1)])
            for p in np.argwhere(m): pass
    dotmask = np.isin(clab, [i for i in range(1, nc + 1) if (clab == i).sum() < 140])
    # prune spurs and dot remnants
    def endpoint(p): return deg[p] == 1
    out = []
    for s in segs:
        if all(dotmask[p] for p in s): continue
        L = len(s)
        if L < 10 and (endpoint(s[0]) or endpoint(s[-1])): continue
        if L < 3: continue
        out.append([(int(p[1]), int(p[0])) for p in s])
    # order: DFS from the lowest point (the stem base)
    keyof = lambda pt: int(lab[pt[1], pt[0]]) if node[pt[1], pt[0]] else ('p', pt)
    inc = {}
    for i, s in enumerate(out):
        for end in (s[0], s[-1]): inc.setdefault(keyof(end), []).append(i)
    start = max(range(len(out)), key=lambda i: max(out[i][0][1], out[i][-1][1]))
    s0 = out[start]
    first_key = keyof(s0[0] if s0[0][1] >= s0[-1][1] else s0[-1])
    order, done = [], set()
    def dfs(k):
        stack = [k]
        while stack:
            k = stack[-1]
            cand = [i for i in inc.get(k, []) if i not in done]
            if not cand: stack.pop(); continue
            cand.sort(key=lambda i: -min(out[i][0][1], out[i][-1][1]))  # lower first, so it climbs
            i = cand[0]; done.add(i)
            s = out[i] if keyof(out[i][0]) == k else out[i][::-1]
            order.append(s); stack.append(keyof(s[-1]))
    dfs(first_key)
    while len(done) < len(out):
        last = order[-1][-1] if order else (380, 760)
        i = min((i for i in range(len(out)) if i not in done), key=lambda i: min(math.dist(last, out[i][0]), math.dist(last, out[i][-1])))
        s = out[i] if math.dist(last, out[i][0]) <= math.dist(last, out[i][-1]) else out[i][::-1]
        done.add(i); order.append(s); dfs(keyof(s[-1]))
    paths = []
    for s in order:
        sp = rdp(s, 0.75)
        d = 'M' + ' L'.join(f'{x} {y}' for x, y in sp)
        paths.append([d, round(float(plen(s)), 1)])
    # head box: rows where the ink is wide
    rows = np.where(ink.any(1))[0]
    widths = np.array([np.ptp(np.where(ink[r])[0]) if ink[r].any() else 0 for r in range(H)])
    wide = np.where(widths >= 0.55 * widths.max())[0]
    top, bot = rows.min(), wide.max()
    cols = np.where(ink[top:bot + 1].any(0))[0]
    cx, cy, side = (cols.min() + cols.max()) / 2, (top + bot) / 2, max(cols.max() - cols.min(), bot - top) * 1.08
    head = [int(round(cx - side / 2)), int(round(cy - side / 2)), int(round(side)), int(round(side))]
    return {'paths': paths, 'dots': dots, 'head': head, 'bot': int(bot), 'len': int(round(sum(p[1] for p in paths)))}

res = {n: vectorize(n) for n in FILES}
for n, r in res.items(): print(n, len(r['paths']), 'paths', len(r['dots']), 'dots', 'len', r['len'], 'head', r['head'])
json.dump(res, open(sys.argv[2], 'w'), separators=(',', ':'))
