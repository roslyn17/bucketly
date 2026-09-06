# Bucketly redesign — implementation prompt for Claude Code

Paste everything below into Claude Code, in the repo root. Attach these files with it:

| File | What it is |
| --- | --- |
| `handoff/01-dashboard.png` | dashboard — the primary target (option 1b) |
| `handoff/02-browse-catalog.png` | browse catalog |
| `handoff/03-list-detail.png` | list detail |
| `handoff/04-share-card.png` | share card + modal |
| `handoff/05-public-profile.png` | public profile |
| `handoff/06-sign-in.png` | sign in |
| `assets/bucketly-mark.png` | logo mark, transparent — copy to `public/` |
| `assets/bucketly-lockup.png` | full lockup, transparent — copy to `public/` |

Numbers, labels and avatars in the screenshots are sample data — read real values from the DB as the code already does. Where a screenshot and this prompt disagree, the prompt wins.

---

We're rebranding this app from "Travel Bucket List" to **Bucketly** and applying a visual redesign. I have a mockup: use the option labelled **1b (Refresh)** as the target for the dashboard, and options 1d–1h for the other screens. Ignore option 1i (mobile) — desktop web only for now. Match the mockup's colors, type, spacing and radii precisely; do not invent new colors.

**Scope: presentation only.** Do not change the data model, queries, server actions, scoring, or the level system. `src/lib/types.ts`, `src/lib/difficulty.ts` (point values), `src/lib/level.ts`, `src/lib/profileStats.ts`, `src/lib/listActions.ts` and everything under `supabase/` stay as they are — except `DIFFICULTY_TIER_COLORS`, which gets new class values (below). Keep drag-to-reorder, the Completed section, the confetti-on-complete behaviour, the checkbox-pop / points-pop animations, and the public/private profile logic working exactly as they do now.

## 1. Brand and tokens

Rename throughout: metadata title, header wordmark, the share-card text, the share text in `ProfileSharingControls.handleNativeShare`, and `travelbucketlist.app` → `bucketly.app`. Product name is lowercase-styled "bucketly" in the wordmark ("bucket" in navy, "ly" in teal) but "Bucketly" in prose.

Add the logo files to `public/`: `public/bucketly-mark.png` (square, transparent) and `public/bucketly-lockup.png` (full lockup, transparent). Render them with `next/image`.

Define these in `src/app/globals.css` as CSS variables and expose them to Tailwind via `@theme inline`:

| Token | Value | Use |
| --- | --- | --- |
| `--brand-coral` | `#F2635E` | primary buttons, primary stat, brand mark |
| `--brand-coral-hover` | `#E0524D` | primary button hover |
| `--brand-teal` | `#2FC4D6` | **all progress fill**, completed state, links |
| `--brand-teal-ink` | `#2A9FB0` | teal text on light backgrounds |
| `--brand-yellow` | `#F9C63C` | points / XP accents, tier chip |
| `--brand-navy` | `#1B2559` | ink, hero band, sidebar, dark cards |
| `--brand-navy-2` | `#2A3563` | navy hover / inset surfaces |
| `--brand-navy-3` | `#2E3968` | dividers and track fills on navy |
| `--brand-navy-ink` | `#A6AECF` | secondary text on navy |
| `--surface-page` | `#FBFAF3` | page background (cream, replaces white) |
| `--surface-card` | `#FFFFFF` | cards |
| `--surface-sunken` | `#F1EDE0` | progress tracks, segmented control, neutral tiles |
| `--line` | `#EDEAE0` | card borders |
| `--line-strong` | `#DCD8C8` | secondary button borders |
| `--text-1` | `#1B2559` | headings |
| `--text-2` | `#4A5273` | body |
| `--text-3` | `#8189A8` | meta |
| `--text-4` | `#A9A695` | faint meta on cream |
| `--done-bg` | `#F0FBFC` | completed card background |
| `--done-border` | `#BDEAF0` | completed card border |

Radii: 10px buttons and small tiles, 14–16px cards, 18px hero/banner, 99px pills. Shadows are minimal: cards get `0 1px 3px rgba(27,37,89,.07)`, hover `0 4px 14px rgba(27,37,89,.07)`.

**The single most important token change:** every progress bar and every "done" affordance that is currently `bg-zinc-900 dark:bg-zinc-50` becomes teal. Grep for `bg-zinc-900` and treat each hit as either a primary action (→ coral) or a progress/done indicator (→ teal).

**Type:** replace Geist with **Nunito** (headings, weights 700/800) and **DM Sans** (body/UI) via `next/font/google` in `src/app/layout.tsx`, wired as `--font-display` and `--font-sans`. Remove the `font-family: Arial, Helvetica, sans-serif` rule on `body`. Headings use Nunito 800 with `-0.01em` tracking; numbers in stats are Nunito 800.

**Dark mode:** the mockup is light-only and the current dark variants are half-finished. Either drop the `dark:` variants and the `prefers-color-scheme` block entirely, or keep them but stop at parity — do not design a new dark theme. Tell me which you did.

Rewrite `DIFFICULTY_TIER_COLORS` in `src/lib/difficulty.ts` to these tints (keep the keys and the `satisfies` guarantee):

| Tier | Background | Text |
| --- | --- | --- |
| `low` | `#E6F8FB` | `#1E7C8A` |
| `medium-low` | `#F3F9E2` | `#5E7A16` |
| `medium` | `#FEF4D6` | `#8A6A11` |
| `medium-high` | `#FDEEDC` | `#9A5A11` |
| `high` | `#FDECEA` | `#B33B36` |
| `very-high` | `#EDEBFB` | `#4A3E9E` |

`DifficultyBadge` keeps its current shape (`rounded-full px-2 py-0.5 text-[11px] font-medium`) and stays the only place these are applied — including on the catalog cards.

## 2. List icons

Keep `LIST_EMOJI` and keep the emoji. Change only the presentation: every list icon is now an emoji centred in a **28–34px rounded-[10px] tinted tile**. Add a sibling map in `src/lib/listEmoji.ts` — `LIST_ICON_TINT: Record<string, string>` keyed by the same slugs — giving each list a tile background from the tint set above (national-parks coral `#FDECEA`, us-states / continents teal `#E6F8FB`, mlb-stadiums yellow `#FEF4D6`, grand-slam-tennis lime `#F3F9E2`, etc.), with `--surface-sunken` as the fallback. Pull the tile into a small shared `ListIcon` component (`{ slug, size }`) and use it on the dashboard cards, catalog cards, public profile cards and list detail header, so there's one implementation.

## 3. Screen-by-screen

**`src/components/Header.tsx` / `HeaderRight.tsx`** — white bar, `--line` bottom border, 32px mark + "bucketly" wordmark. Right side: a yellow points pill (`218 pts`) and the user's avatar instead of the raw email. Keep the route-aware "Viewing a public profile" state. Sign out moves into a small dropdown on the avatar.

**`src/app/dashboard/page.tsx`** — this is where 1b differs most from today:

1. **Progress band** replaces the plain avatar row: a navy `rounded-[18px]` panel, 24px padding, holding the avatar (76px), display name in Nunito 800 24px white, the level name as a yellow pill (uppercase, letter-spacing .04em), an 11px XP track (navy-3 track, teal→`#8BE0EA` gradient fill) using the existing `progressPct`, and a three-part label beneath it: current points, `232 more to Collector` (the "more" in yellow), and the next tier's `minPoints`. On the right, inside the same panel and separated by a 1px navy-3 divider: three stats — items completed, lists completed, lists tracked.
2. **The three `StatTile`s are absorbed into that band** — delete the separate stat grid from the dashboard. Keep `StatTile` itself: the public profile still uses it (restyled, see below).
3. **Tier ladder** — a white card under the band: the label `TIERS`, then the seven `LEVELS` from `src/lib/level.ts` as connector-and-label pairs; tiers reached get a teal connector and teal-ink label, the current tier is a coral pill, unreached tiers are `--text-4` on an `--surface-sunken` connector. Collapse the tail to `+N more` above four unreached tiers so it fits.
4. **Section header** — "Your bucket lists" (Nunito 800 21px) with a segmented control (`In progress {n}` / `Completed {n}`) on an `--surface-sunken` track, and the coral `+ Add bucket list` button on the right. The segmented control replaces today's collapsible Completed section; keep the collapse behaviour available if that's a smaller diff, but the tabs are the target.
5. **`SortableListGrid` cards** — 2-up, `rounded-[16px]`, 18px padding, laid out as a horizontal row: a 62px **progress ring** on the left (`conic-gradient(var(--brand-teal) 0 {pct}%, var(--surface-sunken) {pct}% 100%)` with a 48px white inner circle showing `{pct}%`), then the `ListIcon` + list name, then `11 of 63 visited · 55 pts` (the points in `#8A6A11`), then a row of the difficulty pill, `5 pts / item`, and a right-aligned `Continue →` in teal-ink. Hover: teal border + the 4px shadow. Completed cards use `--done-bg` / `--done-border`, a teal `✓ Done` pill, and a full teal ring.
6. The grip handle stays on the card (top-right, `--line-strong`, coral on hover) and `Remove` moves into the hover state so it stops competing with the progress. Keep the drag listeners on the handle only.

**`src/app/lists/[slug]/page.tsx` + `ListItemsClient` + `ItemRow`** — header becomes a white `rounded-[18px]` card: 52px list icon tile, list name in Nunito 800 24px, difficulty pill + `5 pts per park · 11 of 63 visited` (nowrap), and the list's earned points in coral, right-aligned. A 12px teal gradient progress bar sits directly under the card. Then the search field (`rounded-[12px]`, `--line` border) with `Reset progress` as a secondary button beside it. Items become rows in one white `rounded-[16px]` card, divided by `#F3F0E6`, 14px padding: a 23px `rounded-[7px]` checkbox (unchecked = 2px `--line-strong` border on white; checked = solid teal with a white ✓), the item name in DM Sans 600 14px, metadata beneath in `--text-3`, then the date button (teal-ink when a date is set, `--text-3` for "Add date") and `5 pts` in `--text-4`. Keep the pop and float animations; recolor the floating `+N` to coral. Keep the whole row clickable to toggle. The "list complete" banner uses `--done-bg` / `--done-border` with navy text, and keeps the confetti.

**`src/app/lists/add/page.tsx`** — retitle "Browse bucket lists" with a subhead (`14 lists across 3 categories`) and a scoring link. Add a filter row of pills (All / one per `LIST_GROUPS` entry with counts) — client-side filtering is fine. Group headers become `Travel` + a hairline rule + `9 lists` on the right, dropping the emoji from the heading. Cards: `rounded-[16px]`, tinted `ListIcon`, name, difficulty pill + `10 pts / item · 195 items`, description in `--text-2`, coral `+ Add to my lists`. After adding, the button becomes a non-primary `✓ On your dashboard` rather than the card vanishing.

**`src/components/ProfileSharingControls.tsx` + `src/lib/shareSnapshot.ts`** — the generated card gets the navy treatment from 1f: navy background, a soft `#232E5C` circle bleeding off the top-right, the mark + wordmark at the top, a 118px circular avatar, name in Nunito 800, the yellow level pill, then three stats (points in teal, items in yellow, lists in white), and `bucketly.app/u/{name}` under a navy-3 divider. Modal chrome: white `rounded-[20px]`, coral `Share`, outlined `Download`, quiet `Close`, and the copy-link row on `--surface-page`. The visibility toggle stays where it is but as a real switch styled with the tokens.

**`src/app/u/[username]/page.tsx`** — same profile header as the dashboard but light (white card, navy name, yellow tier pill) and read-only, with the three `StatTile`s restyled as `--surface-page` inset blocks (coral / navy / teal numbers). List cards are the 3-up read-only variant. The bottom CTA becomes a navy `rounded-[18px]` banner: "Start your own bucket list" + one line of substance ("14 ready-made lists — national parks, stadiums, films. Free.") + a coral `Create my list` button. Keep the "This profile is private" state, restyled.

**`src/app/login/page.tsx` + `signup/page.tsx`** — split screen. Left: navy panel with the mark + wordmark, a Nunito 800 30px value line ("Every park, stadium and continent you've ever meant to see — in one bucket."), a row of content pills (`63 national parks`, `195 countries`, `30 MLB stadiums`, `+11 more lists`), and a one-line footnote about points and tiers. Right: a 400px cream column with the lockup image, "Welcome back", the Google button, an `or` divider, the fields (`rounded-[11px]`, teal border on focus), a coral submit, and the switch link in teal-ink. `GoogleButton` keeps its current behaviour.

## 4. Ground rules

- Desktop web only. Leave the existing responsive breakpoints working, but don't design or add mobile-specific UI (no bottom nav, no new `sm:` layouts beyond keeping things from breaking).
- One PR-sized pass per area; start with the tokens, fonts, header and dashboard, then stop and show me before doing the rest.
- No new dependencies. Tailwind utilities + the CSS variables only.
- Keep every existing comment that explains *why* (the profileStats fetch note, the ItemRow keying note, the SortableListGrid order-sync note, the HeaderRight route-awareness note). Update them if behaviour changes.
- Body text ≥ 13px and ≥ 4.5:1 contrast; don't put `--text-4` on white.
- Run `npm run build` and fix any type errors before you hand back.
