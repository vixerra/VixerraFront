# Marketing style tiles — thumbnail prompts

One paste-ready prompt per entry in [`src/lib/marketing-styles.ts`](../src/lib/marketing-styles.ts),
for generating the art that fills each card in the style picker. Today those tiles are drawn from
`motif` + `palette` as CSS/SVG (see `src/components/studio/style-preview.tsx`) and the repo ships no
image assets — these prompts produce raster stand-ins in the same palette, so a tile can be swapped
without the grid changing color.

**Settings.** Nano Banana Pro (`google/nano-banana-pro`), aspect **3:4** — the picker card is
`aspect-[3/4]` and the studio's idle canvas reuses the same crop. 1K is plenty at the size these
render. No reference image.

**Conventions baked into every prompt below.**

- **Unbranded stand-in product.** A tile must not look like one customer's product, and a real logo
  in the picker is a trademark problem, not a taste one.
- **Type as abstract bars.** Styles that carry copy (all of Ads, plus Spec Infographic, Scale & Size
  and Kinetic Typography) show it as solid blocks rather than words. At 160 px no headline is legible
  anyway, and asking for real words buys nothing but gibberish letterforms.
- **Video styles ask for a single representative frame** — the tile is a still either way.
- **Palette hexes are carried from the catalog**, so generated art sits in the same family as the
  gradient it replaces.
- **Legible at 160 px wide**, which is roughly what a card gets at the 4-column breakpoint.

**Output path: `public/marketing/<id>.webp`**, named for the style id — that exact name is what
`thumbnail` points at in the catalog. Generate at 3:4, then convert: 800 px wide, webp q82 (sharp is
already a dependency). The 22 tiles below came in at 17.5 MB as PNG/JPEG and 0.87 MB after.

## Status

All 35 styles have a still. The 13 video styles (all of UGC and Motion) also have a hover loop at
`public/marketing/videos/<id>.mp4`, which plays over the still while the card is hovered or focused
and is not fetched before that. All 13 clips are 704×1280, 2.04 s.

**A video style's still is its clip's first frame, not a prompt from this file.** Hover restarts the
loop at 0 and fades it in over the still, so the two have to match for the handoff to be invisible.
When a clip is regenerated, re-extract frame 0 as `public/marketing/<id>.webp`. The single-frame
prompts in the UGC and Motion sections below predate the clips and are no longer what those tiles use.

`kinetic-typography` is worth regenerating: no words ever animate — it is a magenta wipe across a
bottle, which reads as a transition rather than as type.

Three tiles are worth regenerating when convenient:

| Style | Why |
| --- | --- |
| `feature-callouts` | Off-brief: no leader lines from product to labels, red/blue instead of the catalog palette, and the artwork sits inside a white border instead of bleeding to the edges. |
| `offer-burst` | Right composition, wrong palette — it came out in Headline Hero's lime and dark green, so the two sit next to each other in the grid looking like one style. |
| `billboard` | The hero is a recognizable AirPods Pro. Everything else honours the unbranded rule; this one needs a generic stand-in. `scale-diagram` has the same issue more mildly (its scale object is an identifiable phone). |

Several type tiles rendered legible-but-nonsense words (`HEAT / HEADLINE / HERB`) rather than the
abstract bars the prompts ask for. Harmless at tile size, but if a regeneration is happening anyway,
push harder on "solid bars, no letterforms".

---

## Product shot

### Studio Seamless — `studio-seamless`

*Product shot · image · `#e9e4dc → #b8b0a4` · motif `object`*

```text
An unbranded matte cream cosmetic bottle on a seamless studio sweep, a large soft key at 45 degrees with a fill card lifting the shadow side and a top rim separating the bottle from the background, smooth gradient falloff behind it, a soft contact shadow anchoring it to the surface, 85mm look with the whole bottle sharp, warm neutral palette running from #e9e4dc to #b8b0a4. Vertical 3:4 tile, product centered with generous even margins, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Stone Pedestal — `stone-pedestal`

*Product shot · image · `#d8cfc2 → #8d8478` · motif `pedestal`*

```text
An unbranded amber glass jar raised on a travertine plinth in a minimal plaster set, hard directional sunlight raking across it, a long soft-edged shadow with a warm bounce filling the shade, low three-quarter camera looking slightly up so the jar reads monumental, generous air above it, warm neutral palette from #d8cfc2 to #8d8478. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Splash & Freeze — `splash-freeze`

*Product shot · image · `#7fd4e8 → #1c6f92` · motif `splash`*

```text
A plain unlabelled aluminium can with a water splash frozen mid-air around it, crystalline droplets suspended with clean rims, a wet reflective surface below, hard backlight making the liquid glow, ultra-crisp macro detail, the can perfectly still and razor-sharp at the center of the motion, cyan to deep teal palette from #7fd4e8 to #1c6f92. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Natural Set — `natural-set`

*Product shot · image · `#cfd7c2 → #6f7a5c` · motif `object`*

```text
An unbranded frosted glass dropper bottle staged on raw stone and crumpled linen with fresh foliage, dappled daylight through leaves drawing organic shadow shapes, soft directional window light, shallow depth of field with the bottle crisp and the props falling off, calm sage and clay palette from #cfd7c2 to #6f7a5c. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Dark Luxe — `dark-luxe`

*Product shot · image · `#3a3a42 → #0c0c10` · motif `object`*

```text
An unbranded black glass perfume flacon on a black glossy surface, one hard rim light tracing the silhouette and a soft edge kick on the opposite side, deep falloff into near-black, controlled specular highlights, a mirrored reflection beneath it, the flacon held small inside a large dark frame, palette from #3a3a42 to #0c0c10. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Gradient Pop — `gradient-pop`

*Product shot · image · `#ff8f5e → #c026d3` · motif `object`*

```text
A plain unlabelled cylindrical can floating weightless against a bold duotone gradient running from #ff8f5e into #c026d3, hard colored studio lights throwing crisp overlapping shadow shapes, punchy saturated color, glossy highlights, high-key contrast, plenty of flat color left around the can. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Ingredient Burst — `ingredient-burst`

*Product shot · image · `#ffd166 → #e2662b` · motif `splash`*

```text
An unbranded supplement jar at the center of fruit slices, seeds and powder bursting outward in mid-air, motion frozen at high shutter speed with every element crisp and individually readable, a bright even key with a soft top light, weightless radial arrangement with the jar upright and unobscured, warm amber backdrop from #ffd166 to #e2662b. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Flat Lay — `flat-lay`

*Product shot · image · `#e7dfd4 → #a99e8c` · motif `grid`*

```text
Top-down flat lay of an unbranded cream tube with a few styled props on a textured linen surface, arranged on an invisible grid with even spacing, soft diffuse daylight with consistent shadows all falling the same way, camera perfectly square-on with no perspective skew, generous negative space, muted palette from #e7dfd4 to #a99e8c. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### In Hand — `in-hand`

*Product shot · image · `#e8c9b4 → #8c6a55` · motif `portrait`*

```text
A hand holding an unbranded cream tube, cropped close on the point of contact, soft directional daylight with a gentle falloff, the tube crisp and the person softly out of focus behind it, natural unretouched skin texture, an unposed candid gesture that shows real scale, warm palette from #e8c9b4 to #8c6a55. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Range Lineup — `range-lineup`

*Product shot · image · `#dcd8d2 → #7e7a72` · motif `grid`*

```text
Three identical unbranded bottles in different colorways lined up in a single row, evenly spaced and identically lit, matched height and one shared eye level, a soft studio key with a single consistent shadow direction, no bottle overlapping another, plain gradient backdrop from #dcd8d2 to #7e7a72. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

---

## Ads

### Headline Hero — `headline-hero`

*Ads · image · `#bbdc12 → #1d2408` · motif `type`*

```text
An advertising key visual: a large headline rendered as bold abstract type bars locked to a clear grid, an unbranded bottle hero beside it under dramatic single-source light, a color-blocked #bbdc12 field over a deep #1d2408 ground, a deliberate hierarchy of headline then product then one small bar, generous negative space. Vertical 3:4 tile, all copy shown as solid abstract bars and never as legible words, no logo, no watermark, instantly readable at 160 px wide.
```

### Offer Burst — `offer-burst`

*Ads · image · `#ff0052 → #ffd400` · motif `burst`*

```text
A retail promo layout: a bold circular discount badge carrying one large % symbol over a radial burst of #ff0052 and #ffd400, an unbranded box cut out crisply in front of the burst with a soft drop shadow, loud but tidy. Vertical 3:4 tile, the % is the only glyph in frame and every other line of copy is a solid abstract bar, no logo, no watermark, instantly readable at 160 px wide.
```

### Feature Callouts — `feature-callouts`

*Ads · image · `#9fb8d8 → #243247` · motif `split`*

```text
A clean annotated layout: hairline leader lines running from precise points on an unbranded device to small blank label chips, balanced left and right with no line crossing another, the device centered on a flat #9fb8d8 background under even studio light, #243247 line work, plenty of empty space. Vertical 3:4 tile, labels shown as blank chips rather than words, no logo, no watermark, instantly readable at 160 px wide.
```

### Before / After — `before-after`

*Ads · image · `#8ad2b0 → #22553f` · motif `split`*

```text
A split-frame comparison divided by a crisp vertical line, identical framing, lens, lighting and background on both halves so only the result differs, a small blank label chip in matching corners, honest documentary treatment with no grading between the halves, mint to forest palette from #8ad2b0 to #22553f. Vertical 3:4 tile, labels as blank chips rather than words, no logo, no watermark, instantly readable at 160 px wide.
```

### Testimonial Card — `testimonial-card`

*Ads · image · `#f2c3b1 → #8a4b3a` · motif `portrait`*

```text
A social-proof ad: a warm smiling portrait on one side, a quote card on the other carrying a row of five filled stars above three abstract text bars, soft #f2c3b1 background with #8a4b3a accents, flattering natural light and true skin tone, an unbranded jar visible small in frame, clean card edges and comfortable margins. Vertical 3:4 tile, stars are real shapes but the quote stays abstract bars, no logo, no watermark, instantly readable at 160 px wide.
```

### Story Frame — `story-frame`

*Ads · image · `#ff7a45 → #2b1054` · motif `type`*

```text
A full-bleed vertical ad frame: an unbranded bottle hero filling the upper two thirds, a short headline above it as bold abstract type bars and a solid call-to-action band low in the frame, high-contrast #ff7a45 on a deep #2b1054 ground, the top and bottom eighths left clear. Vertical 3:4 tile, all copy shown as solid abstract bars and never as legible words, no logo, no watermark, instantly readable at 160 px wide.
```

### Billboard — `billboard`

*Ads · image · `#5b6cff → #101430` · motif `type`*

```text
A dusk city billboard carrying giant abstract type bars and one unbranded product hero, extreme simplicity, cool ambient light with a single warm practical glow, #5b6cff panel against a #101430 sky. Vertical 3:4 tile with the billboard face nearly full-bleed and just enough city to place it, type as solid bars only, no logo, no watermark, instantly readable at 160 px wide.
```

---

## Marketplace

### Pure White — `pure-white`

*Marketplace · image · `#ffffff → #c9c9cf` · motif `object`*

```text
An unbranded white spray bottle on a pure white RGB 255,255,255 background, even shadowless lighting from both sides, filling about 85 percent of the frame, square-on hero angle, crisp edges with no halo or cut-out fringe, at most a faint contact shadow, the faintest #c9c9cf falloff at the very edges so the tile does not read as empty. Vertical 3:4 tile, no props, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Spec Infographic — `spec-infographic`

*Marketplace · image · `#9ad1ff → #1b3a5c` · motif `grid`*

```text
A listing infographic: an unbranded appliance centered with three simple line icons and blank label chips in a clean icon-led grid, flat #9ad1ff background, one #1b3a5c accent, thick shapes sized to stay readable at thumbnail scale, even spacing and strict alignment. Vertical 3:4 tile, icons and blank chips only with no legible words, no logo, no watermark, instantly readable at 160 px wide.
```

### Scale & Size — `scale-diagram`

*Marketplace · image · `#d5d9de → #5a636e` · motif `split`*

```text
A dimension diagram: an unbranded box straight-on with thin measurement lines, end ticks and blank size chips on a neutral #d5d9de field, one consistent #5a636e line weight, technical-drawing precision, uncluttered, a simple everyday object beside it for scale. Vertical 3:4 tile, size labels as blank chips rather than numerals, no logo, no watermark, instantly readable at 160 px wide.
```

### In Use — `in-use`

*Marketplace · image · `#e3d3bd → #7d6549` · motif `portrait`*

```text
An unbranded ceramic kettle being used on a real kitchen counter, soft window light with a warm bounce, authentic candid framing, shallow depth of field with the kettle sharp and the room falling away, a tidy but lived-in set, natural skin tone on the hand, warm palette from #e3d3bd to #7d6549. Vertical 3:4 tile, no other brand anywhere in frame, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Bundle Contents — `bundle-contents`

*Marketplace · image · `#dfe3e8 → #8b93a1` · motif `grid`*

```text
An everything-in-the-box layout: an unbranded main unit largest and centered with its cable, case and adapter laid out top-down around it on a soft #dfe3e8 surface, equal spacing and consistent orientation, even shadowless light, cool #8b93a1 shadows, nothing cropped and nothing overlapping. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

---

## UGC

### Unboxing Selfie — `unboxing-selfie`

*UGC · video · `#f4b8c8 → #7a3450` · motif `phone`*

```text
A single representative frame from a handheld phone selfie video: a person mid-reaction holding an unbranded box up to the lens, natural indoor light from a window, a lived-in room softly out of focus behind, slight handheld tilt and a phone-camera look, warm pink palette from #f4b8c8 to #7a3450. Vertical 3:4 tile, no captions, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Talking Review — `talking-review`

*UGC · video · `#c9d8f0 → #33445e` · motif `portrait`*

```text
A single representative frame from a creator review: a person talking straight to camera while holding an unbranded bottle at chest height, a home background slightly out of focus, soft natural light on the face, eye contact with the lens, framing from just above eye level, cool palette from #c9d8f0 to #33445e. Vertical 3:4 tile, no captions, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Problem → Fix — `problem-fix`

*UGC · video · `#a8d5ba → #2f4f43` · motif `phone`*

```text
A single representative frame from a vertical phone clip, caught at the moment the problem is solved: the same person and room as the opening frustration but visibly relieved, holding an unbranded product, handheld unpolished framing, natural light, green palette from #a8d5ba to #2f4f43. Vertical 3:4 tile, no captions, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Get Ready With Me — `grwm`

*UGC · video · `#f3d9b1 → #8a6134` · motif `phone`*

```text
A single representative frame from a get-ready-with-me clip: a person at a vanity mirror mid-routine, using an unbranded tube while talking to camera, warm ambient light with a soft bulb glow around the mirror, relaxed multitasking energy, palette from #f3d9b1 to #8a6134. Vertical 3:4 tile, no captions, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Hands-On Demo — `hands-on-demo`

*UGC · video · `#dcd3c6 → #6b6152` · motif `object`*

```text
A single representative frame from a hands-on demo: a close top-down view of hands working an unbranded device on a clean surface, no face in frame, crisp macro detail on the point of contact, soft even light with no blown reflections, neutral palette from #dcd3c6 to #6b6152. Vertical 3:4 tile, no captions, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Street Vox Pop — `street-vox-pop`

*UGC · video · `#b9c4c9 → #3c4a52` · motif `portrait`*

```text
A single representative frame from a documentary street interview: a person holding an unbranded can mid-answer to an off-camera question, shallow depth of field with city bokeh behind, natural daylight, slight handheld framing, cool palette from #b9c4c9 to #3c4a52. Vertical 3:4 tile, no captions, no text, no logo, no watermark, instantly readable at 160 px wide.
```

---

## Motion

### 2D Product Motion — `2d-product-motion`

*Motion · video · `#b18cf5 → #f0d9c4` · motif `object`*

```text
A single representative frame of flat graphic motion design: an unbranded bottle composited over animated 2D shapes and paper-cut layers caught mid-transition, bold flat color in #b18cf5 and #f0d9c4, locked-off framing with no shake, the bottle fully visible and unobscured. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Hypermotion — `hypermotion`

*Motion · video · `#63e6be → #0d6b7a` · motif `splash`*

```text
A single representative frame from a hyper-kinetic macro spot: an unbranded can sharp at the center of a whip-panned frame, motion streaks and liquid bursting in slow motion around it, punchy contrast and saturated color, teal palette from #63e6be to #0d6b7a. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Kinetic Typography — `kinetic-typography`

*Motion · video · `#ff5fa2 → #2b0a1b` · motif `type`*

```text
A single representative frame from a kinetic typography spot: large bold abstract type bars flying on and off around an unbranded bottle anchored at the center, high-contrast #ff5fa2 blocks on a near-black #2b0a1b ground, the bottle never covered by the bars. Vertical 3:4 tile, type as solid bars only and never legible words, no logo, no watermark, instantly readable at 160 px wide.
```

### Dark Minimalism — `dark-minimalism`

*Motion · video · `#4a4f57 → #0a0a0c` · motif `object`*

```text
A single representative frame from a slow premium spot: an unbranded matte device on a minimal dark set, a single travelling light source tracing its edges, deep negative space and restraint, palette falling from #4a4f57 to #0a0a0c. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Liquid Pour — `liquid-pour`

*Motion · video · `#f0b67f → #7c3f1d` · motif `splash`*

```text
A single representative macro frame from a slow-motion pour: thick glossy liquid falling past an unbranded jar with real viscosity and weight, controlled studio light with crisp specular highlights, a luxurious tactile feel, amber palette from #f0b67f to #7c3f1d. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Orbit Turntable — `orbit-turntable`

*Motion · video · `#a8b6c8 → #2c3746` · motif `orbit`*

```text
A single representative frame from a 360-degree turntable orbit: an unbranded speaker centered and stationary on a studio gradient running from #a8b6c8 into #2c3746, consistent specular highlights, a faint circular arc on the surface suggesting the camera path. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```

### Particle Reveal — `particle-reveal`

*Motion · video · `#7dd3fc → #0c1f3d` · motif `burst`*

```text
A single representative frame from a particle reveal: an unbranded product half-assembled from drifting glowing particles in a dark studio, subtle volumetric light rays, cyan #7dd3fc particles against a deep #0c1f3d ground, clear space left above the product. Vertical 3:4 tile, no text, no logo, no watermark, instantly readable at 160 px wide.
```
