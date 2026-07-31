# Moon AI — constellation badge system (M27)

Framing: **skill / practice** (not "beat it once"). Visual: **constellations** on the Soul page.
Tiers: **count-based** — each time you regulate that emotion, one more star lights. Fully lit = the constellation "rises" on your sky.

Ties together: M27 (theme), M28 (finish reward = a star lighting), M26 (reveal = stars lighting one by one), and the Soul page collection.

## The sky (19 emotions, 5 regions)

Each emotion = a constellation whose myth fits the feeling (the story). Cute badge name = the title shown when earned.

### Ember — heat that flares
| Emotion | Constellation | Why it fits | Badge |
|---|---|---|---|
| Rage / anger | Draco | the dragon you settle, not slay | Dragontamer |
| Irritability | Lynx | the prickly cat, hard to soothe | Softpaw |
| Frustration | Fornax (furnace) | heat you let cool | Cooled Coal |

### Deep — heavy, sinking
| Emotion | Constellation | Why it fits | Badge |
|---|---|---|---|
| Sadness / tears | Aquarius | the water-bearer pours it out | Tidekeeper |
| Grief | Lyra | Orpheus's harp, the grief-song | Songkeeper |
| Numbness | relit star | the dim star you rekindle | Rekindled |
| Loneliness | Cygnus | the lone swan crossing the night | Nightswan |

### Fog — fear, uncertainty
| Emotion | Constellation | Why it fits | Badge |
|---|---|---|---|
| Anxiety | Reticulum (the net) | the web of what-ifs, untangled | Netclearer |
| Dread | Duskward (invented) | waiting out the approaching dark | Dawnwaiter |
| Overwhelm | Vela (the sails) | you trim the sails in the storm | Sailtrimmer |
| Fear | Orion | the hunter who faces the beast | Nightfacer |

### Rift — relational wounds
| Emotion | Constellation | Why it fits | Badge |
|---|---|---|---|
| Betrayal | Corvus | the crow myth, deceit turned to knowing | Truthfinder |
| Hurt | Sagitta (the arrow) | arrow drawn out, wound tended | Arrowdrawn |
| Rejection | Columba | the dove that finds its way back | Homedove |
| Abandonment | Ursa | Callisto placed in the sky, never lost | Stillheld |

### Mirror — self-directed
| Emotion | Constellation | Why it fits | Badge |
|---|---|---|---|
| Shame | Phoenix | rises from its own ash | Ashrisen |
| Guilt | Libra | the scales set right | Evenscale |
| Jealousy / envy | Pavo | the peacock's hundred eyes, calmed | Eyesrest |
| Inadequacy | Corona Borealis | the crown, worth returned | Crownfound |

## Asset list (Neha sourcing as transparent PNGs, @3x, one cute style)

Reveal = illustrated figure PNG + star light-layer on top (stars animate/light per count). Figures are drawn assets, NOT hand-coded SVG. Full set = 19, one per emotion. Stand-ins used where the real constellation figure isn't cute.

| # | PNG | Cute name | Emotion | Note |
|---|---|---|---|---|
| 1 | dragon.png | Dragontamer | Rage / anger | Draco |
| 2 | lynx.png | Softpaw | Irritability | Lynx |
| 3 | campfire.png | Cooled Coal | Frustration | stand-in |
| 4 | raincloud.png | Rainkeeper | Sadness / tears | stand-in |
| 5 | harp.png | Songkeeper | Grief | Lyra |
| 6 | lantern.png | Rekindled | Numbness | stand-in |
| 7 | swan.png | Nightswan | Loneliness | Cygnus |
| 8 | yarnball.png | Untangler | Anxiety | stand-in |
| 9 | owl.png | Dawnwaiter | Dread | stand-in |
| 10 | sailboat.png | Sailtrimmer | Overwhelm | Vela |
| 11 | fox.png | Nightfacer | Fear | stand-in |
| 12 | crow.png | Truthfinder | Betrayal | Corvus |
| 13 | arrow.png | Arrowdrawn | Hurt | Sagitta |
| 14 | dove.png | Homedove | Rejection | Columba |
| 15 | bear.png | Stillheld | Abandonment | Ursa Major |
| 16 | phoenix.png | Ashrisen | Shame | Phoenix |
| 17 | scales.png | Evenscale | Guilt | Libra |
| 18 | peacock.png | Eyesrest | Jealousy / envy | Pavo |
| 19 | crown.png | Crownfound | Inadequacy | Corona Borealis |

PNG spec: transparent bg, @3x, consistent cute style, filename = creature.
Open: big reward moon (M28) art — existing asset / animated, or new PNG?

## Star layer (Claude owns this)
Each figure has a small star-data object: `{ id, stars:[{x,y,mag}], count }`, coords normalized to the PNG box. One renderer lights `count` stars over the PNG. Same layer drives scratch-reveal, count tiers, and the Soul-page sky. Region = glow color (Ember warm, Deep blue, Fog violet, Rift rose, Mirror gold).

## (superseded) earlier idea: render constellations from real star data — DON'T make images

A constellation IS a set of star points + connecting lines. Render it, don't draw it.

- **Data model, not art.** Each constellation = `{ id, region, stars: [{x,y,mag}], lines: [[i,j]], count }` in one file. ~19 tiny arrays.
- **One renderer** (SVG/Canvas) draws: unlit stars faint, lit stars glowing, lines drawn as they connect. Lighting = `count` → how many stars are on.
- Real ones (Draco, Lyra, Orion, Cygnus, Ursa, Corvus, Aquarius, Vela, Libra, Corona Borealis, Pavo, Phoenix, Columba, Sagitta, Lynx, Fornax, Reticulum) → trace actual star coordinates (public-domain IAU/Stellarium line data). Authentic shapes for free.
- Invented ones (Duskward, relit-star for Numbness) → hand-place ~6 dots.
- Region = glow color (Ember warm, Deep blue, Fog grey-violet, Rift rose, Mirror gold).

Why this wins: no per-tier assets, count-based tiers are automatic, the reveal/reward animations (M26/M28) are the same "light a star" motion, files are bytes not PNGs, fully themeable, retina-crisp.

Neha's only manual job: place/adjust star dots for the ~19 shapes (fast). No 57 hand-drawn tier images.

## Tier naming (draft)
Star fills 1-by-1. Milestones: first light → filling → risen. Set N later (e.g. risen at 12).

## Open
- Lock the exact 19 against **M7** (AI emotion vocabulary) so badges and AI picks match.
