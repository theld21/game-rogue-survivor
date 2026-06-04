# Game Dev Playbook — Phaser 3 + Vite + TS + Tailwind (mobile/iOS WebView)

Kinh nghiệm rút ra khi làm game-4 (Sea of Neon) và game-5 (Cosmic Miner). Đọc cái này TRƯỚC khi bắt đầu game mới để khỏi vấp lại các bug đã sửa.

---

## 0. Tech stack chuẩn (đã verified hoạt động)

- **Vite + TypeScript + Phaser 3.90 (Arcade) + Tailwind 3 + GSAP + LocalForage**
- KHÔNG cần daisyUI (game-5 bỏ, tự viết component Tailwind sạch hơn).
- Procedural Web Audio thay vì file âm thanh (zero-asset, xem §6).
- Tất cả đồ họa = vector vẽ runtime (`Phaser.GameObjects.Graphics`) + texture bake lên canvas. KHÔNG load file ảnh → không lỗi network trong WebView, build nhẹ (~1.6MB toàn Phaser).
- Bundle luôn ~1.6MB vì Phaser; đừng lo "chunk > 500kB" warning.

Tái dùng config từ game cũ: `cp vite.config.ts tsconfig.json postcss.config.js` rồi sửa port + package.json name.

---

## 1. ⚠️ BUG QUAN TRỌNG NHẤT: Canvas scale trên mobile

**Triệu chứng:** trên điện thoại thật mọi thứ to gấp 2-3 lần, giao diện vỡ, nhân vật ở nửa dưới màn hình biến mất.

**Nguyên nhân:** `Scale.NONE` với `width: innerWidth * dpr`. Trên iPhone (dpr=3) canvas có resolution nội bộ 1170px nhưng NONE không scale CSS → canvas hiển thị ở pixel thật trên màn 390px → tràn + phóng to. Entity đặt ở `height * 0.8` bị đẩy ra ngoài viewport.

**FIX (luôn dùng cho mobile):**
```ts
const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap 2, đủ nét + nhẹ
const config = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,            // Phaser tự scale canvas qua CSS
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth * dpr,    // resolution nội bộ cao = crisp
    height: window.innerHeight * dpr,
  },
};
window.addEventListener('resize', () => game.scale.refresh());
window.addEventListener('orientationchange', () => game.scale.refresh());
```
`FIT` + aspect khớp viewport = fill khít, không letterbox. Scene coords (`this.scale.width/height`) vẫn là resolution nội bộ; FIT chỉ scale visual nên không ảnh hưởng logic.

> Game-4 camera-follow che giấu bug này (ship luôn center) nên dễ bỏ sót. Vẫn phải fix vì "to quá" vẫn xảy ra.

### ⚠️ Canvas-vs-DOM overlap — đừng định vị theo 2 hệ tọa độ độc lập

Triệu chứng (game-5 menu): phi thuyền vẽ bằng Phaser ở `height*0.30` (canvas) còn title là DOM theo flex. Hai hệ độc lập → trên mỗi máy thật (safe-area/kích thước khác) chúng lệch và **đè lên nhau**. Tinh chỉnh `mt-[Nvh]` cứng KHÔNG fix triệt để — chỉ đúng trên 1 cỡ màn, sai cỡ khác (lúc trống lúc đè).

**Quy tắc:** một phần tử trang trí cần xếp tương đối với UI DOM thì **vẽ luôn bằng DOM** (SVG inline + CSS animation), đặt cùng flex container với UI đó. Đừng vẽ nó bằng Phaser rồi căn thủ công. Canvas chỉ dùng cho thứ KHÔNG cần đồng bộ với DOM (starfield nền, gameplay).
- Menu hero ship: SVG trong flow (`<div class="menu-ship"><svg>…</svg></div>`) + `@keyframes shipFloat`/`flameFlicker`. Ship + title cùng flex flow → không bao giờ đè.
- Layout dọc responsive: dùng **flex spacer tỉ lệ** (`flex-[2]` … content flex-none … `flex-[1]`) thay vì margin `vh` cứng. Co giãn đúng mọi màn, không ẩn nội dung.

---

## 2. Phaser 3.90 API gotchas

- **StaticBody circle offset:** `physics.add.existing(container, true)` đặt body tại top-left. Sau `setCircle(r)` tâm lệch (+r, +r). Fix: `body.setOffset(-r, -r)` (public API, tự xử lý staticTree). ĐỪNG gọi `staticTree.add()` — không tồn tại; 3.90 dùng `.insert()`. Tốt nhất tránh đụng staticTree trực tiếp.
- **`Container.body`**: đừng đặt field tên `body` trong subclass của Container — trùng physics property → TS2416. Đặt tên khác (`hullGfx`...).
- **`EnemyShip extends Container` có `state`**: Container có protected `state` → đổi tên field thành `aiState`.
- **`physics.add.collider(container, ...)`**: type defs không nhận Container subclass → cast `as any`. Hoạt động runtime.
- **`Graphics` KHÔNG có `bezierCurveTo`**: vẽ đường cong bằng nhiều `lineBetween` (piecewise) hoặc `arc`.
- **`as const` trên config numeric**: làm field thành literal type (vd `320` thay vì `number`) → lỗi gán. Chỉ `as const` cho bảng cần key-type (palette, rarity); bỏ cho block tuning số.

---

## 3. Kiến trúc (pattern ổn định)

- **EventBus singleton** (`new Phaser.Events.EventEmitter()`) bắc cầu Phaser scenes ↔ DOM overlay (main.ts). Scenes emit STATE; DOM emit INTENT. KHÔNG cho scene truy cập DOM trực tiếp.
- **Storage/GameState write-through:** hydrate 1 lần async lúc boot, sau đó in-memory là source of truth, mọi mutation `persist()` fire-and-forget (KHÔNG await trong game loop). LocalForage.
- **Scenes:** Boot/Preloader (bake texture + hydrate) → Menu → GamePlay (orchestrator) → Shop → (GameOver = DOM panel, không cần scene riêng).
- **Entity callbacks, KHÔNG `scene.events.emit`:** entity (vd Gun) giao tiếp với scene qua callback `onFireLaser/onCollect/...`. Dùng `scene.events` dễ leak listener qua scene.restart() và double-fire. (game-5 đã sửa từ scene.events sang callback.)
- **teardown():** mọi scene `EventBus.removeAllListeners(evt)` cho từng event đã đăng ký, + destroy pool/starfield, trong `SHUTDOWN` once handler.
- Chia file: `scenes/`, `entities/`, `systems/` (pool, fx, starfield), `core/` (config, state, audio, i18n), `data/`.

---

## 4. Memory leak — checklist (đã từng dính)

- **Web Audio oscillator không stop:** mỗi layer drone/music PHẢI lưu vào array và stop hết khi `stopMusic()`. Một lần quên `return` của 1 layer → leak mỗi lần vào menu. Track `droneNodes: {osc,gain}[]`.
- **setTimeout sau khi nhạc dừng:** reverb tail dùng `setTimeout` có thể fire sau `stopMusic()` → tạo oscillator "ma". Dùng counter `musicGen++` trong stopMusic, capture `gen` trước setTimeout, bỏ qua nếu `musicGen !== captured`.
- **GSAP/tween entity:** lưu tween ref, `.kill()` trong `destroy()`. One-shot FX tự hủy qua `onComplete: () => obj.destroy()` (OK, không leak).
- **`repeat:-1` tween nhắm vào graphic con bị destroy giữa scene:** leak thật. Phaser tween `repeat:-1` KHÔNG bao giờ complete → nếu target (graphic con của entity) bị destroy mà tween không kill, nó tick mãi trên object chết. PHẢI lưu ref + `.stop()`/`.kill()` trong cả `destroy()` VÀ đường thu/biến mất khác (vd `collect()`). (game-5: hazard item warn tween.)
- **gsap vs Phaser cleanup là 2 hệ riêng:** Phaser `scene.tweens` tự dọn khi scene shutdown, NHƯNG gsap sống ở timeline global — Phaser shutdown không biết gsap. gsap `repeat:-1` chỉ được kill nếu `entity.destroy()` override chạy. Phaser `DisplayList.shutdown` CÓ gọi `destroy(true)` trên mỗi child (verified), nhưng đừng phụ thuộc ngầm: cho `teardown()` **destroy entity tường minh** (`items.forEach(i=>i.destroy())`...). Gọi destroy 2 lần an toàn (Phaser guard `destroyed`).
- **Idempotent kill:** hàm `kill()` của entity có thể bị gọi 2 lần cùng frame (vd comet trúng laser + va chạm) → guard `if (this.dead) return` ở đầu, tránh double `delayedCall`/double-destroy.
- Phaser `DisplayList.shutdown` → `destroy(true)` mỗi child; `InputPlugin.shutdown` → `removeAllListeners()` (input listener KHÔNG leak qua restart, 1 tap = 1 hành động). Nhưng listener trên **EventBus global** thì KHÔNG tự gỡ — phải `removeAllListeners(evt)` trong teardown.

---

## 5. Game-loop & ProMotion 120Hz

- **Luôn delta-time:** mọi chuyển động nhân `delta/1000` (hoặc `delta/16.67` cho lerp). Hardcode per-frame chạy 2× nhanh ở 120fps.
- **Collision:** dùng manual distance-check (`Phaser.Math.Distance.Between < r`) cho projectile/grab thay vì arcade overlap callback — đơn giản, không dính body offset, dễ kiểm soát. Pool object (laser/cannonball) tái dùng, đừng tạo mới vô hạn.
- **HUD throttle:** emit HUD event mỗi ~100ms (accumulator), không mỗi frame.
- **Kinematic > physics projectile:** mỏ neo/claw, laser nên mô hình kinematic (`pos = anchor + angle × length`) thay vì arcade body — tránh hẳn nhóm bug body offset.

---

## 6. Procedural Web Audio (zero file)

- 1 `AudioContext`, master→music/sfx gain. iOS unlock: listener `click/touchstart/touchend` gọi `ctx.resume()`.
- SFX = oscillator + noise buffer ngắn, ramp gain exponential về 0.001.
- Nhạc = `setInterval` sequencer theo step; menu dùng pad chord + drone trầm + melody thưa (sâu lắng), in-game dùng arpeggio + kick (nhịp).
- Volume music/sfx riêng, lưu Storage, áp lúc hydrate (gọi `setMusicVolume` SAU init, đừng gọi `init()` lần 2 — nó `return` sớm nếu ctx tồn tại, không áp volume).

---

## 7. UI / UX (mobile portrait, iOS)

- **Emoji vs SVG:** dùng **SVG inline** (`stroke=currentColor`) cho mọi nút điều khiển/chrome (pause, settings, shop, mode indicator, upgrade icon, nút Launch — KHÔNG để `▶` emoji). Chỉ giữ emoji ở chỗ "payoff cảm xúc" (🏆 thắng / 💥 thua / ⭐). User để ý và phàn nàn emoji control nhiều lần.
- Helper: `const svg = (paths, sw=2) => \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" ...>${paths}</svg>\`` rồi `el.innerHTML = ICONS.x`. Đặt icon vào `<span class="w-5 h-5">`.
- **Safe-area:** `p-[max(env(safe-area-inset-top),20px)]`, `bottom-[max(env(safe-area-inset-bottom),20px)]`. ĐỪNG nhét `pb-[env(safe-area-inset-bottom)]` vào nút đã có `py-3` → padding bất đối xứng làm lệch chữ. Để safe-area ở `bottom`, padding để Tailwind class thường.
- `html,body { position:fixed; overflow:hidden; touch-action:none }` chống rubber-band iOS.
- Panel dài: `overflow-y-auto` + `panel-scroll` để không vỡ trên màn ngắn (iPhone SE).
- `background-clip: padding-box` trên nút gradient (chống bleed viền trên WebView).
- Cyberpunk/neon: glassmorphism (`backdrop-blur` + bg trong suốt + inset highlight), gradient text qua `-webkit-background-clip:text`.
- DPR-aware đã ở §1. Font tiếng Việt: Orbitron/Pirata One KHÔNG có dấu tiếng Việt → khi lang=vi swap sang "Be Vietnam Pro" qua class `.lang-vi .font-display`.

---

## 8. Tiền tệ & tiến trình (2 lớp)

Pattern 2 tiền tệ hiệu quả (game-4/5):
- **Meta currency bền vững** (☀️ sun / credits): nhặt/kiếm qua run, lưu Storage, CHỈ dùng mua nâng cấp vĩnh viễn ở menu shop. Giá nâng cấp tăng dốc (~×2.5/cấp) nếu farm được liên tục.
- **Session currency** (🪙 gold): reset mỗi màn, kiếm trong màn, tiêu trong màn (sửa chữa, mua đồ tạm). KHÔNG lưu Storage.
- **Consumables/active items:** mua bằng meta currency ở shop, tích trữ (lưu Storage count), kích hoạt trong game qua nút HUD → hiệu ứng có thời hạn (magnet hút đồ, overcharge x2 dame, multishot...). Track `xUntil = now + duration`, check `now < xUntil`.
- Permanent upgrade: stat = base × (1 + level × bonusPct). PlayerShip đọc effective stat lúc tạo (mỗi màn tạo mới = tự reset về base + upgrade, không link data giữa màn).

---

## 8b. Scale lên nhiều màn + thế giới cuộn (game-6)

- **Generate, đừng hand-author 20 levels.** Level = param record (tier/theme/gateCount/gapWidth/drift...); geometry sinh bằng generator. Lý do quyết định *generator vs template*: **viết được reachability assertion không?** Có → generator. Corridor-first: rải "gate" (khe hở) từ pickup→pad, tâm drift trong bound → flyable BY CONSTRUCTION.
- **Verify solvability HEADLESS.** Tách data/Levels thành module thuần (không import Phaser) → chạy assertion bằng `npx esbuild test.ts --bundle --format=esm --platform=node | node --input-type=module`. Không thể play-test 20 màn bằng screenshot; assertion là cách verify.
- **Số khó = công thức từ kích thước entity**, không hard-code. `minGap = max(2·droneR, 2·cargoR) + swing` lấy từ config → retune physics chỉ đổi 1 hằng, không phá 200 wall.
- **Thế giới cao + camera cuộn KHÔNG phá fixed-resolution.** Giữ width + physics constants; chỉ tăng worldHeight per-route + `camera.startFollow(target,true,lerp)` + `setFollowOffset(0,-90)` (thấy phía dưới nhiều hơn khi rơi xuống) + `setDeadzone`. FIT vẫn map view.
- **"Không mất người chơi" = off-screen indicator** (Graphics `setScrollFactor(0)` vẽ mũi tên ở mép view chỉ về target off-screen + distance). Treat as required cho world cuộn.
- **Bake background tall vào 1 RenderTexture** (`scene.make.graphics` → `rt.draw(g)` → `g.destroy()`), seed RNG bằng route id (ổn định khi replay). Tall world bằng retained Graphics = hàng trăm lệnh vẽ sống mãi; RT = 1 GPU texture, per-frame cost 0.
- **Moving platform Arcade:** dynamic body `setImmovable(true)` + `setAllowGravity(false)` + set velocity, **reverse ở bound** (đừng set `x` thủ công → drift). Wind zone: rect, test containment, `body.velocity.x += accel*dt`.
- Input "nửa màn hình" dùng `pointer.x` (screen space), KHÔNG `worldX` (lệch khi camera scroll ngang).

## 9. Quy trình làm việc với user này

- **KHÔNG kill port bừa.** User chạy cloudflared tunnel — `lsof|kill` hay giết nhầm. Chỉ kill đúng PID vite (verify `ps -p <pid> -o args | grep vite`). Dự án có HMR → chạy `npm run dev` MỘT lần background, sửa file là tự reload, KHÔNG restart.
- Mỗi game 1 port riêng (game-3/4: 3334, game-5: 3335) — tránh conflict. Nhưng user hay yêu cầu chạy game cụ thể ở 3334.
- Verify: typecheck (`npx tsc --noEmit`) sau mỗi cụm thay đổi, KHÔNG để 20 thay đổi rồi typecheck 1 lần. Production `vite build` để bắt lỗi bundle.
- Game mới chưa chạy runtime: verify 1 lần bằng Playwright ở viewport mobile thật (390×844) — chụp menu + gameplay, check console errors. Sau đó dọn screenshot + `.playwright-mcp`. User hạn chế Playwright, chỉ dùng khi cần checkpoint thật.
- Build core khó nhất TRƯỚC (vertical slice), rồi mở rộng breadth. Gọi advisor trước khi commit kiến trúc cho task lớn.

## 10. Cơ chế "phản xạ"/occlusion + verify solvability có ràng buộc hướng (game-7)

- **Game đơn giản + tường vô nghĩa = CÙNG một gốc.** Nếu dash/đạn xuyên thẳng qua hình học, tường chỉ là trang trí. Fix bằng **occlusion**: thêm 1 boolean vào điều kiện lock (`segmentBlocked` qua `LineToRectangle`) — biến "vẽ đường" thành câu đố định tuyến. Rẻ hơn rewrite sequencer nhiều.
- **Wall-bounce (bắn vào viền bật ngược):** drag tới biên 2 bên → "dính", đoạn cuối **phản xạ quanh biên dọc** (`reflDir=(-dx,dy)`), dash bắn về phía đối diện, lock địch trên tia phản xạ. Bend hop qua điểm chạm B (lerp 0–0.5 from→B, 0.5–1 B→target); **`from` để check front-hit/bounce-back PHẢI là B** (đánh khiên từ phía sau). Hop tới biên cũng phải wall-free (occlusion từ chối bounce không hợp lệ).
- **Free-fall thường CHỈ theo trục đứng** (kinematic, không có launch ngang). Hệ quả: địch khiên hướng-cạnh chỉ giết được từ platform bên dưới nó → nếu không có chain nào kết thúc gần đó, **bất khả thi trực tiếp** → bounce là lối thoát DUY NHẤT. Đây chính là lý do một màn "không qua được" dù checker cũ báo pass.
- **Solvability assertion phải mô hình hóa RÀNG BUỘC HƯỚNG, không chỉ reachability.** Checker cũ chỉ hỏi "có segment wall-free tới địch?" → bỏ sót shield-facing → false pass. Checker đúng: địch killable chỉ khi có approach wall-free **VÀ non-front** (`frontStatic` dùng facing), **trực tiếp HOẶC qua bounce** (mirror địch qua biên x=0/W rồi nội suy điểm chạm). Khiên động (xoay/nháy) = luôn-mở → coi như grunt. Chạy headless như §8b.
- **Test input runtime cho Phaser: synthetic `PointerEvent` KHÔNG tới input manager.** Phải dùng `browser_run_code_unsafe` + `page.mouse.move/down/up` (chuột thật). Tính screen↔logical từ `canvas.getBoundingClientRect()` (FIT có letterbox: `top` offset + `scale=rect.w/logicalW`).
- **Preview màn bị khóa:** ghi thẳng IndexedDB store (vd `CyberSlash`/`profile`/`<profile_key>`) `highestLevel`+`clearedLevels`, reload, click node DOM + nút launch. Nhanh hơn play-qua từng màn.
- **Địch động = redraw graphics riêng mỗi tick** (`shieldGfx` add vào container → tự destroy theo container, leak-safe), tick bằng dt slow-mo để đọc dễ lúc aim. KHÔNG thêm tween repeat:-1 cho thứ này.

## 11. Open-world thu nhỏ + culling (game-8 Aether Drift)

- **Open-world KHÔNG dùng fixed-resolution.** Quay lại DPR-aware FIT (§1: `innerWidth*dpr` + Scale.FIT) vì camera-follow; fixed 450×800 chỉ cho game màn cố định (game-6/7).
- **Culling là bắt buộc, làm sớm.** Mỗi frame: `v = camera.worldView`; entity ngoài `v` + pad (220) → `setVisible(false).setActive(false)` và với static body island `body.enable=false`. Pad đủ để không "pop" ở mép. Bật lại khi vào view. Đây là thứ giữ 4000² mượt trên iOS.
- **Va chạm: distance-check TRƯỚC, arcade CHỈ khi sát.** Ship↔island = 1 arcade collider (static circle body, bật/tắt theo cull). Mọi thứ khác (đạn↔địch, địch↔ship, pickup↔ship, bullet↔block) = `Math.hypot < r` thủ công. Đừng arcade-overlap toàn map.
- **Pool MỌI thứ sinh/hủy liên tục** (đạn 2 phe, pickup tài nguyên): mảng preallocated + Image tái dùng (`setActive/Visible(false)` = "chết"), zero-GC. GSAP chỉ cho juice 1-shot (pop/collect) và phải `.kill()` khi recycle. Magnet về target ĐANG DI CHUYỂN = per-frame lerp, KHÔNG single GSAP tween (target đứng yên mới được).
- **"Reduced vision"/vignette = baked radial-gradient TEXTURE** (transparent center → opaque edge), đặt Image `setScrollFactor(0)` tint tối, chỉnh alpha/displaySize. `Graphics.fillRect` rồi fill center alpha-0 KHÔNG khoét lỗ được (không có destination-out).
- **Procedural world = module thuần seeded** (mulberry32) sinh đảo (rejection-sampling spacing) + bảng giá per-đảo (base × biome-bias × variance) → vòng lặp arbitrage. Tách khỏi Phaser để test/ổn định.
- **Reserved Container fields lại cắn:** `data` (DataManager!) → đổi `info`; `state` → `aiState`; field `body` → `hullGfx` + `declare body`. (Bổ sung §2.)
- **Day/night = 1 Rectangle/overlay scrollFactor 0**, màu+alpha lerp qua keyframe, drive bằng GSAP proxy `{t}` repeat:-1 onUpdate. `isNight` bật headlight cone + dày sương đảo tối.
- **HUD DOM ↔ scene qua EventBus** y như cũ: joystick/fire/mine/trade = INTENT lên scene; hud/radar/minimap/dock = STATE xuống DOM. Joystick: base động tại điểm chạm trong `#joy-zone`, `setPointerCapture`, emit `{x,y,mag normalized}`.
