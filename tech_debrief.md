# Technical Debrief: Four Times My Reasoning Was Confident and Wrong

> A retrospective on building a 25-hero ball-battle simulator.
> This is not a feature log. It documents **four design calls I got wrong, and what caught each one.**

---

## 0. The project, and the constraints I chose

A browser auto-battler: 25 protagonists from Chinese web novels, each reduced to one distinct mechanic. Balls bounce around an arena, use abilities, and fight until one side is wiped.

Self-imposed constraints that shaped every later decision:

- **Zero dependencies, zero build step.** Double-click `index.html` and it runs.
- Hand-written Canvas. Circle-circle collision — the units are literally circles, so no physics engine.
- Eventually split into `js/engine.js` + `characters/*.js` (one file per hero) + `maps/*.js`.
- Classic `<script src>` tags rather than ES modules, because **ES modules are blocked by CORS under `file://`** — the page goes blank on double-click. I traded the cleaner module system to keep "double-click and play."

None of that is what made the project interesting. This is:

---

## 1. The precondition for everything below: a headless harness

The engine's `update(dt)` is separated from rendering. So the same combat code runs two ways:

- **With rendering** → the game a player sees.
- **Without rendering** → a simulation that runs as fast as the CPU allows.

That gave me a strength-test lab: every hero fights every other hero, C(25,2) = 300 pairings, N runs each, producing a full power ranking and a **counter-matchup matrix** (who beats whom, and by how much) in seconds.

**The critical design choice: the lab runs the real game code, not a simplified model of it.** I never wrote a separate "combat model for analysis." That would only ever tell me what my model believes about balance, not what the game actually does.

That choice caught all four errors below.

---

## 2. Case 1 — A geometry bug wearing an AI costume

**Symptom.** In AI-vs-AI matches, two melee units would circle each other endlessly without ever making contact.

**What it looked like.** An AI logic bug. Wrong target selection? A stuck state machine?

**What it actually was.** Middle-school geometry.

A unit moves at constant speed and may rotate at most `ω` radians per frame. Its **minimum turning radius is `v / ω`.**

```
Shi Hao: speed 305 px/s (base 235 × speedMul 1.3), turn rate 2.4 rad/s
minimum turning radius = 305 / 2.4 ≈ 127 px
Arena: 400 × 600
```

**His turning circle was wider than half the arena.** He wasn't declining to attack — he was kinematically incapable of turning tightly enough to intercept. Measured: one melee pairing produced **1 frame of contact in 60 seconds.**

The part worth remembering: **I caused half of this myself.** Earlier, a playtester said melee felt too slow to catch anyone. My fix was to add `speedMul 1.3–1.5` to melee heroes — **raising `v` without touching `ω`.** Since r = v/ω, my "fix" inflated the turning radius by 30–50% and made the real problem worse.

The actual fix:

```js
// Turn rate must scale with speed, or the turning circle outgrows the arena.
const TURN_RADIUS = 34;
const turn = Math.max(f.seek, sp / TURN_RADIUS);
```

Plus removing a 0.15 tangential component from the chase heading. It was meant to stop pursuit from looking robotically straight; it was in fact the direct cause of the orbiting.

| Metric | Before | After |
|---|---|---|
| Contact frames in 60s (one melee pairing) | 1 | **91** |
| Match timeout rate | 14% | **0%** |
| Mean match duration | 22.2s | 11.0s |

**Lesson.** When an agent "behaves wrong," first check whether it is *physically capable* of the behavior you expect, before debugging its decision logic. An agent failing to do something may be a kinematic constraint, not an intent problem.

**Secondary lesson.** If a change touches the numerator of a governing equation, immediately ask what the denominator is.

---

## 3. Case 2 — The balance had silently fitted itself to the bug

I expected the movement fix to mean "melee can finally connect." What actually happened, with **no numbers changed**:

```
Before the fix (tuned balance):  38pt spread, 2 of 25 heroes marginally out of band
After the fix  (same numbers):   Cornerstone 95%, Shi Yu 93% … Xiao Yan 11%, Linley 15%
                                 84pt spread
```

**Why.** In the old balance, kiting was a viable strategy *because pursuers could not turn*. A meaningful share of every ranged hero's survivability came from the bug. The moment pursuit worked, they were run down and deleted.

Put differently: **every number I had tuned was a fit to the system's behavior at the time, and that behavior contained a bug.** Fix the substrate and the entire parameter set is invalidated at once.

Re-balancing surfaced which values had only ever been *compensation* for the bug:

- Melee `speedMul 1.3–1.5` → originally compensating for "can't catch anyone"; now pure overtuning. Removed.
- `CONTACT_CD = 0.45` (ram damage cooldown) → set that low because ramming **rarely landed**. With reliable contact it had to go to 0.75.
- Kite AI circled when cornered (fixed tangential weight) → changed so the tangential term decays with distance; cornered units now flee in a straight line.

Final state returned to a 38pt spread — but this time sitting on **correct movement** instead of on a bug.

**Lesson.** After fixing a low-level bug, re-validate every parameter that was tuned against the old behavior. Parameters are never independent; they are fits to the system as it behaved when you tuned them.
This is the same failure mode as machine learning: **hyperparameters fitted on a wrong model are worthless once the model changes — and they look "tuned," so nothing raises an error.**

---

## 4. Case 3 — The metric was not the goal

The lab measures **AI vs AI**. The actual players (a friend and I) were playing **human vs human**. The two rankings disagreed sharply:

> Human verdict: "Ji Ning, Lu Li and Shi Yu feel weak; Panyue, Tang San and Xiao Yan feel strong."
> Lab verdict: not that order at all.

**The root cause was not numbers. It was margin for error.**

The lab's AI casts the instant a cooldown expires, paths optimally, and never misfires. A human has to press the key (and will forget, or press early) and steer manually (and will hit a wall, or over-commit).

| Feels strong to humans | Why |
|---|---|
| Panyue | The shield is **passive** — full value for doing nothing |
| Xiao Yan | Strong projectile homing + large blast: **you can throw it blind** |
| Tang San | Slow to 35% speed effectively **immobilises** the target |

| Feels weak to humans | Why |
|---|---|
| Ji Ning | A dead window after the volley; requires **timing** |
| Lu Li | Damage scales as his HP drops; requires **deliberate risk** |
| Shi Yu | Pressing the key merely "waited for a summon" — **no agency at all** |

The fixes were design changes, not number tweaks:

- Xiao Yan's projectile homing 2.2 → 1.6 rad/s: **now dodgeable by a human**, with AoE damage untouched. (This required adding per-projectile `homing` to the engine.)
- Tang San's slow 0.35 → 0.55: being cut to a third of your speed reads as a stun in PvP and feels terrible.
- Shi Yu **redesigned**: summoning became automatic; the key became a *battle command* (pet gains damage and a speed surge). From "press to wait" to "press to decide."

**The cost, stated plainly:** Xiao Yan's simulated win rate fell from 46% to 25%. **The two modes optimise in opposite directions** — the AI lab rewards strong homing (high hit rate = strong), while human opponents resent it (undodgeable = unfair).

**Lesson.** Maximising a metric is not the same as achieving the goal. Ask regularly: *is the thing I am measuring the thing I actually want?* Here the lab measured **mechanical strength**, while PvP needed **human operability**. Related, not equivalent. When they conflict, human experience wins and the lab is demoted to a guardrail against a hero collapsing entirely in simulation.

---

## 5. Case 4 — Structured reasoning got "fun" backwards

For tournament mode I implemented three seeding algorithms and **defaulted to seeded brackets** (strongest vs weakest, like real sports).

My reasoning sounded solid:

> If every match is forced to 50/50, the champion is just 24 coin flips and the "who is strongest" narrative dies.
> Seeding keeps top contenders apart so **the final is the best match** — the episode builds to a climax.

The playtest verdict: **"Closest-matchup is the most watchable. Seeded is the worst."**

Where my reasoning failed:

1. "Building to a climax" depends on a **long format with commentary and backstory** to carry the early blowouts. Here **a match lasts ten seconds**; each one has to hold attention on its own. There is no "sit through this, it gets good later."
2. The roster's strength spread is only 38pt — so a seeded first round is neither suspenseful **nor lopsided enough to be spectacle.** It lands in the dead middle.

The algorithms did measurably do what they claimed (mean deviation from a 50/50 matchup in round one):

| Mode | Mean deviation | Watchability (measured by watching) |
|---|---|---|
| Closest matchups | **4.2pt** | Best — now the default |
| Random draw | 22.9pt | Middle |
| Seeded | 27.1pt | Worst |

The algorithm was fine. **My model of "what is fun" was wrong.**

**Lesson.** Measurable quantities can be reasoned about. **Subjective experience — is this fun, does this feel good — has to be tested, not derived.** This was the second time in this project I lost to the same class of error.

---

## 6. The bug I shipped three times

One failure mode recurred in identical form, and deserves its own section:

> **A hero's AI standoff distance exceeded its own ability range — so it permanently stood where it could not hit anything.**

| Hero | Symptom | Cause |
|---|---|---|
| Fang Li | 5% win rate | `kiteDist 120` > ability range `85` |
| Jiang Nan | 5% win rate | `kiteDist 150` > self-centred blast radius `85` |
| Jiang Nan (again) | 9% win rate | Converted to a melee profile, then given too little HP to survive to cast |

The third instance is the most instructive: trying to *nerf* Jiang Nan, I cut his HP tier from high to medium and he fell to 9%. **A melee burst hero without HP never lives long enough to use the ability.** He needed a damage nerf, not a survivability nerf.

**Turned into a checklist.** When adding a close-range ability, verify `ai` / `kiteDist` / `range` are mutually consistent. When nerfing a melee hero, cut damage, not HP.

---

## 7. A large refactor with low risk

At 1223 lines the single file needed splitting. The method mattered more than the result.

**Don't hand-copy — write a script.** A brace-matching parser extracted the `ROSTER` entries, each `if (s.type === ...)` branch of the skill dispatcher, and the translation table, grouped them by hero id, and generated 25 character files automatically.

The core change replaced a large if/else chain with a **skill registry**, so each hero file owns both its data and its mechanic:

```js
registerSkill('drain', { ai, init, cd, badges, tick, draw });
registerHero({ id, name, color, emblem, skill: {...}, i18n: {...} });
```

**How I verified the refactor changed nothing:** run a full strength board before and after.

```
Before refactor:  39pt spread
After refactor:   40pt spread   ← inside sampling noise
```

That is the real payoff of the harness: **refactor correctness is confirmed by a quantitative behavioural fingerprint, not by "looks fine to me."**

Result: `index.html` down to ~210 lines (markup plus script tags), `js/engine.js` ~1000 lines, 25 hero files, 8 map files, 1 emblem file. Adding a hero is one new file and one script tag, with no engine changes.

---

## 8. Transferable lessons

Independent of this project:

1. **Make automated tests run the real code, not a simplified model.** The moment they diverge, you are testing your assumptions instead of your system.
2. **Before fixing a low-level bug, ask which higher-level parameters have been silently compensating for it.** Those parameters look tuned and will not raise an error.
3. **Distinguish the metric from the goal.** A metric improving does not mean the goal was met.
4. **Subjective judgments — fun, feel, watchability — must be tested, not derived.**
5. **When no amount of number tuning works, the problem is usually mechanical or geometric, not numerical.** A pure-contact hero losing to a shield hero didn't need more damage; it needed a *way through shields*.
6. **Write down every call you got wrong.** Of the four here, three failed in the same direction: **I over-trusted my own structured reasoning.**

---

## 9. Appendix: current state

| Item | Value |
|---|---|
| Heroes / mechanics | 25 / 25 (no mechanic reused) |
| Maps | 8 — rectangles, a circle, a diamond, cross-corridors; obstacles, hazard zones, an electrified boundary |
| 1v1 balance | 34pt spread; 2 heroes marginally out of band |
| Mean match length | ~11s, 0% timeouts |
| Smoke test | 25 heroes × 8 maps = 200/200 |
| Code | 36 files: 1 HTML + 2 engine files + 25 heroes + 8 maps; zero dependencies, zero build, double-click to run |

**The hardest ability**, as a closing example. From *Reverend Insanity*, the "Spring Autumn Cicada": every 5 seconds it rewinds **every unit on the field** to 5 → 4 → 3 → 2 → 1 seconds ago — positions, HP and shields alike, **including reviving anyone who died inside that window** — and is spent permanently after five uses. Meanwhile its user gains +5% to all stats per second, accumulated against *real elapsed time*, so **his own growth is never undone by his own rewind.**

Measured across a match, the rewinds restored 77 → 115 → 81 → 60 → **3** HP: the last use is nearly worthless, so the mechanic self-limits. His stat multiplier climbed 1.25 → 2.25× and never regressed. He landed at a 61% win rate and **needed no numerical tuning at all.**

That wasn't good design instinct. It was the ability to **measure it immediately after building it** — which is, in the end, the thing this project was actually about.
