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

## How we make the images: DON'T make images

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
