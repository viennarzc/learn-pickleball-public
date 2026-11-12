# Learn Pickleball Illustration Style Guide

Version 2.0 — working production guide, reviewed 19 August 2026

## 1. Purpose

Illustrations must help an adult learner understand one movement, decision, or safety idea at a glance. They are instructional diagrams with editorial sports energy—not decoration, cartoons for children, or substitutes for qualified coaching.

Each asset should answer one question:

1. What should my body, paddle, or feet do?
2. What makes the correct version different from the common mistake?
3. Is this an official rule, a coaching convention, or an advanced option?

## 2. Visual signature

| Element | Locked direction |
| --- | --- |
| Rendering | Clean flat editorial vector-like illustration. Crisp edges, broad color fields, no texture, no gradients, no photorealism. |
| Character design | Friendly adults with rounded geometric anatomy, readable hands and joints, slightly exaggerated athletic poses, varied ages, bodies, skin tones, and mobility. |
| Linework | Deep-ink outer contours and selective internal details; consistent medium weight; never sketchy. |
| Composition | One dominant action per panel. Use generous off-white negative space and an unobstructed silhouette. |
| Motion | One or two simple ink or sky-blue arcs, foot markers, or ball trails. Avoid speed-line clutter. |
| Depth | Mostly flat. If separation is needed, use one small solid offset shadow at 10–15% opacity. |
| Court geometry | Court green with off-white lines, coral kitchen, deep-ink net. Keep dimensions and line relationships credible. |
| Mood | Capable, welcoming, high-energy, modern. Never juvenile, aggressive, or elite-only. |

### Provisional palette

These variables support the lofi prototype and are not a final brand system.

| Token | Hex | Use |
| --- | --- | --- |
| Off-white | `#F6F3EA` | Canvas and negative space |
| Ink | `#101828` | Outlines, equipment, high-contrast detail |
| Court green | `#2FA36B` | Court, positive sport context |
| Citrus | `#F6D447` | Ball, highlights, progress |
| Coral | `#F47B61` | Kitchen, alternate clothing, caution |
| Sky | `#69BDEB` | Motion, secondary clothing, learning cues |
| Violet | `#7A67D8` | Advanced technique and optional content |

Use no more than five palette colors in one panel. Correct/incorrect states receive a text or icon label in the interface; color is never the only cue.

## 3. Character and equipment model

- Show adult proportions and recognizable athletic balance. Knees, elbows, wrists, and weight direction must be legible.
- Keep the same simplified oval head, minimal facial features, rounded hands, and solid-color clothing across the library.
- Rotate representation naturally across assets. Include older adults, a range of body shapes, and adaptive play without making difference the subject of every illustration.
- Paddles use a short handle, broad rounded rectangular face, slim edge, and visible grip. Balls are citrus-yellow perforated spheres or simple circles with two to four dark holes.
- Use court shoes with a broad, stable sole and visible lateral support. Do not add real brand marks.
- Do not place words, numbers, logos, watermarks, or UI controls inside generated art. Titles and teaching labels belong in HTML.

## 4. Instructional anatomy rules

Accuracy takes priority over style in these areas:

- The gripping hand must clearly wrap the handle; fingers cannot merge into the paddle.
- Paddle-face angle, contact point, ball height, and follow-through direction must be visible.
- At least one foot must establish weight or travel direction. Do not crop feet in stance or footwork assets.
- A motion sequence uses consistent player handedness within a panel.
- The net and kitchen line remain spatially credible when a rule depends on them.
- “Avoid” panels exaggerate only the relevant mistake and never depict a dangerous action as playful.

## 5. Composition templates

### A. Technique quartet

Four equal panels on one off-white 16:10 canvas. Each panel contains one player and one action. Use a consistent camera angle and no decorative props.

Best for grips, stances, footwork, swing families, and volleys.

### B. Correct / avoid comparison

Two or three panels with matched camera angle and player. The interface supplies “Do” and “Avoid” labels plus the explanation. The art shows the physical difference only.

### C. Hero explainer

One full player plus three to five neatly arranged gear or movement callouts. Use for attire, safety, and readiness.

### D. Court scenario

Elevated three-quarter view or true overhead view. Use only when court position, line, bounce, or partner relationship is the lesson.

### E. Adaptive variation

Matched standing and sport-wheelchair actions at equal visual importance. Do not frame the adaptive player as an exception or add medical symbolism.

## 6. Locked generation prompt kernel

Use this exact art-direction block at the start of every generation prompt:

> Create an original clean flat editorial sports illustration for an adult pickleball learning app. Crisp vector-like shapes, deep-ink medium outlines, rounded geometric anatomy, expressive but minimal faces, anatomically readable hands and feet, credible pickleball paddle and perforated ball, generous off-white negative space, and a limited palette of off-white, deep ink, court green, citrus yellow, coral, sky blue, and occasional violet. Energetic and inclusive, modern rather than childish. No gradients, photorealism, texture, logos, watermarks, typography, labels, or decorative clutter.

Then add, in order:

1. **Asset type and aspect ratio** — quartet, comparison, hero explainer, or court scenario.
2. **Exact panels** — subject, camera angle, pose, paddle face, foot position, and ball/contact point.
3. **Representation** — age, skin tone, body type, and adaptive variation where relevant.
4. **Teaching constraints** — what must remain visually distinct and what must not be cropped.
5. **Background and output** — clean off-white, fully contained figures, no text.

### Negative constraints

Append when needed:

> Exactly the requested number of panels and actions. No duplicated limbs, floating equipment, merged fingers, tennis rackets, baseball bats, extra balls, impossible joints, cropped hands or feet, confusing paddle orientation, branded apparel, or embedded words.

## 7. Rule and coaching labels

Every illustration card must declare its evidence type in the interface:

| Label | Meaning |
| --- | --- |
| Official rule | A court, serve, scoring, equipment, or fault requirement grounded in the current GPF or USA Pickleball rulebook. |
| Beginner fundamental | A technique recommended by USA Pickleball education materials; useful coaching, not a fault rule. |
| Coaching option | A common variation such as grip choice, two-handed backhand, stacking, or shot selection. |
| Advanced | A high-skill play such as an Erne or around-the-post shot. It is not a beginner requirement. |
| Safety guidance | Practical federation or clinical advice. It is not a guarantee against injury. |

Rule-sensitive cards show a source link and a `Reviewed 19 Aug 2026` line. Recreational etiquette is explicitly labeled convention.

## 8. Asset specifications

- Master canvas: 1600 × 1000 px (16:10) unless a court scenario needs 4:3.
- Export: PNG at 2× for the prototype; migrate approved masters to SVG when the final illustration system is commissioned.
- Filename: `topic-specific-action-v2.png`, lowercase kebab case.
- Alt text: state the teaching contrast, not the decorative style. Aim for 15–35 words.
- Captions: one sentence, active voice, no unexplained jargon.
- Keep 8% safe space around every hand, foot, paddle, ball, and motion path.
- Never embed source text or third-party artwork in an asset.

## 9. Quality-control checklist

Before an asset ships, verify:

- [ ] The action is identifiable without reading the title.
- [ ] The requested panel count is exact and the same player is not duplicated accidentally.
- [ ] Hands, paddle face, contact point, knees, and feet are anatomically readable.
- [ ] The illustrated action agrees with its cited source and is labeled as rule, fundamental, option, advanced, or safety guidance.
- [ ] Correct and avoid states have non-color labels in the interface.
- [ ] No real logo, watermark, embedded text, reference-image copy, or unlicensed character is present.
- [ ] The thumbnail remains readable at 320 px wide and does not rely on tiny details.
- [ ] Alt text, caption, source, evidence type, and review date are present.
- [ ] A keyboard user can reach the associated explanation even though the image itself is static.

## 10. Relationship to existing prototype art

`hero-rally.png`, `kitchen-bounce.png`, and `serve-diagonal.png` established the app's bright editorial direction. They remain valid v1 campaign/lesson art. New instructional assets use this stricter v2 system: flatter fields, no gradients, consistent panel templates, evidence labels, and more exact body mechanics.

