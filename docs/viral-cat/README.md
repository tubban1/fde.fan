# DON'T WAKE MISO — data-driven viral web game

Status: **V1 implementation branch** `feat/dont-wake-miso-v1`

Route: `/dont-wake-miso`

## Product thesis

A mobile-first, one-touch social reaction game:

**Cute → greedy → suspicious → freeze → near miss → funny failure → retry → challenge a friend.**

The product does **not** use the Fly Eye concept in V1. The lead character is a cat because the goal is broad-market shareability, not project reuse.

## V1 mechanic

Miso is sleeping on top of a fish. The player drags the fish toward the edge of the table.

- Sleeping: movement advances the fish.
- Fake cue: ear/tail twitch; movement is safe.
- Warning cue: Miso pauses before opening the eyes.
- Watching: any meaningful pointer movement ends the run.
- Survive: Miso falls asleep again.
- Extract the fish: +1 fish and the next cycle becomes faster.
- Failure: exaggerated cat reaction → result → instant retry or friend challenge.

The implementation deliberately makes the real danger cue learnable. Randomness controls **when** a cue happens, not whether the game honors its own signal.

## Why this shape

### Instant play / tiny bundle
Poki's web-game guidance recommends very small initial downloads (about 5 MB or less as a target) and notes that players tend to leave when loading exceeds roughly 10 seconds. The V1 therefore uses original inline SVG + CSS + WebAudio and adds no new runtime dependencies.

Sources:
- https://developers.poki.com/guide/web-engine
- https://developers.poki.com/guide/requirements-quality
- https://developers.poki.com/guide/easy-access

### Skip menus
Poki recommends skipping title screens / level-select friction for first-time players. V1 opens directly on the interaction and starts on the first pointer-down.

Source:
- https://developers.poki.com/guide/easy-access

### Cat-first
The character choice is market-first. Cat imagery has extremely large social distribution and a long history of highly shareable GIF/sticker behavior. Pusheen's official site states its images/GIFs have been sent more than 20 billion times across social platforms. We use that only as evidence for the broad appeal of simple, expressive cat characters — no Pusheen assets are used or copied.

Source:
- https://pusheen.com/pages/about

### Reaction moment instead of horror
The failure needs enough surprise to be clip-worthy, but it should resolve as comedy rather than gore or disgust. V1 uses a fast zoom/shake/flash and an angry-cat result card.

### Friend challenge instead of only a global leaderboard
The URL carries `?beat=N`, producing a concrete "beat N fish" target. It is immediately understandable and doesn't require an account.

## V1 viral hooks

1. **One sentence rule**: "Steal the fish. Freeze when Miso looks."
2. **Readable fake-outs**: ear/tail twitch vs. real eye-open sequence.
3. **Near-miss language**: result text frames failure as "one tiny move too late".
4. **Short retry**: one button, no lobby.
5. **Challenge URL**: `?beat=N` turns every share into a duel.
6. **Share card**: client-side 1080×1350 PNG, suitable for vertical social feeds.
7. **Increasing suspicion**: each successful fish shortens timing windows.
8. **No install/login**: suitable for link-driven traffic.

## What V1 intentionally does not include

- no 3D engine
- no LLM
- no account system
- no paid assets
- no forced ads
- no backend leaderboard
- no external requests from the game
- no copied Brush Jjaemu artwork or animation

Those are downstream experiments, not prerequisites for proving the loop.

## Success criteria before production push

We should instrument and evaluate:
- page → first interaction
- first interaction → first fish
- retry after failure
- second retry
- average run count per session
- challenge-copy/share initiation
- challenge URL → first interaction
- challenger beat-target rate
- mobile vs desktop completion
- rage exits immediately after a real cue

Do not declare the game "viral" from internal playtesting. The first meaningful gate is a small external traffic test with multiple creative variants.
