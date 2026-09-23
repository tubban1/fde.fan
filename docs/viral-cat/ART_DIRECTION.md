# Art direction — DON'T WAKE MISO

## Visual target

**Premium cozy editorial character art**, not realistic fur rendering and not generic emoji/cartoon.

Miso should read in under 200 ms:
- orange cat
- sleepy
- soft / touchable
- slightly smug
- capable of a sudden personality flip

V1 uses original vector art so the first interaction stays extremely light. A later WebGL/GLB version is allowed only if it beats V1 on click-to-play and retention.

## Reference board

These references are for **design principles only**. Do not copy character geometry, compositions, textures, animation, UI, names, or branded details.

### 1. Little Kitty, Big City
Official site / press kit:
- https://www.littlekittybigcity.com/
- https://www.littlekittybigcity.com/press-kit

What to learn:
- readable cat silhouette
- oversized facial readability
- bright clean color blocks
- "cat with personality" rather than realism
- comedy through body pose

### 2. Neko Atsume
Official:
- https://nekoatsume.com/en/
- https://www.nekoatsume.com/sp2/index_en.html

What to learn:
- calm, warm environment
- low visual aggression
- shapes readable on a small phone screen
- cat behavior as the core reward

### 3. Pusheen
Official:
- https://pusheen.com/pages/characters
- https://pusheen.com/pages/about

What to learn:
- instant silhouette recognition
- few facial marks can carry personality
- rounded mass and restrained detail survive stickers/GIFs/social crops
- character moments can become shareable units

## Miso's original visual language

- Body: broad orange oval / loaf shape
- Head: large but not baby-anime proportion
- Ears: triangular, soft inner cream
- Eyes: normally a curved sleeping line; danger state snaps to dark round eyes
- Palette: warm orange + cream + charcoal + muted salmon
- Fur detail: almost none; 4–6 graphic stripe shapes only
- Environment: cream paper background + warm wood tabletop
- Shadows: soft editorial product-photo shadow, not cel-shaded black
- UI: charcoal type, off-white glass pills, no game HUD chrome

## Animation hierarchy

Most of the time: very little movement.

1. breathing: 1–2 px equivalent
2. ear twitch: rare
3. tail twitch: rarer
4. breath pause: real warning
5. eyes open: hard state transition
6. attack: one explosive zoom/shake event

This contrast is intentional: if everything moves, the attack has no punch.

## Production asset budget

V1:
- inline SVG cat + paw + fish
- CSS gradients/shadows
- synthesized sound
- target: essentially zero image-download dependency

V2, only after metrics justify it:
- compressed GLB cat under ~1.5 MB
- 1K or 2K texture atlas
- 3–5 skeletal animations
- progressive load after first interaction
- fallback SVG for slow devices

## Thumbnail / social creative tests

Create at least three ad/post thumbnails:
A. Miso asleep + fish + hand
B. Miso with one eye open + "DON'T MOVE"
C. extreme close-up angry reaction

Do not assume the prettiest one wins. Measure click-through separately from in-game retention.
