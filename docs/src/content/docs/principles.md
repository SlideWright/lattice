---
title: Principles
description: The convictions behind Lattice — why a slide is four decisions, why the colors live in one file, why the system carries the consistency and you carry the judgment.
---

Every design decision in Lattice traces back to a few convictions.
They're worth stating plainly, because they explain what surprises
people about it — why you can't drag a box, why every deck on a theme
looks related. None of it is arbitrary. Here is what Lattice believes.

## A slide is four decisions, not one

In most tools you make every choice at once and by hand — the words,
the layout, the colors, the spacing, all tangled together on a blank
canvas. Lattice pulls those apart into four decisions and lets you make
them one at a time.

- **Function** — what the slide is for. Are you stating a claim,
  comparing options, walking through steps, showing evidence? There are
  seven jobs a slide can do, and naming the job is the first decision.
- **Form** — the shape that holds it. A grid, a stack, a split, a
  timeline. The same evidence can sit in a dozen shapes, and the shape
  is a separate choice from the evidence.
- **Substance** — what fills the shape. Prose, a structured list, a
  data series, a graph.
- **Finish** — the palette and the mood. Light or dark, tight or roomy,
  the brand colors.

Separating them means you can change one without disturbing the rest.
Swap the palette and the deck keeps its structure. Move a grid to a
stack and the data comes along unchanged. Re-class a slide and it says
something new in the same skin. Most of what feels like design in other
tools is these four decisions fighting on one surface. Lattice gives
each its own.

## The colors live in one file

Every color in a Lattice deck comes from a palette — one file, a short
list of named roles. *Accent. Ink. Surface.* The layouts never name a
color directly; they ask the palette for the role and render whatever
it hands back.

Change a brand's entire visual identity in that one file, and it flows
through every layout, every chart, every diagram on the next build. Two
companies can run the same engine and produce decks that look nothing
alike — the way two sites share HTML and look nothing alike under
different CSS. And a chart's text is never stranded in a color the new
palette didn't plan for. The fill and its ink travel together, so both
adapt when the palette flips.

One palette, every deck. Change it once.

## Write what you mean, not where it goes

You write a Lattice deck the way you'd write a memo — in Markdown, the
plain text format behind a million READMEs. A list is a list. A table
is a table. You never place a box, match a font, or nudge anything into
alignment. You say what the slide contains and what it's for, and the
engine decides where it all goes.

That trade has a second half, and it's about words. A heading in
Lattice is meant to be a sentence, not a label. "Revenue" tells the
reader nothing; "Revenue grew 40% on flat headcount" tells them the
whole slide before they read the rest of it. The engine can't write
that line for you, but the system is built to reward it — a deck is
read at speed, and a claim lands faster than a noun.

Because the source is plain text, it has properties a binary slide file
never will. You can diff it, review it in a pull request, grep a whole
archive for a stale figure. If you ever leave Lattice, every deck it
made is still a plain PDF, sitting next to the Markdown that built it.
Nothing locks shut behind you. And when the vocabulary runs out — when
you need something the layouts don't offer — it's plain Markdown and
CSS underneath, and you can edit that directly.

## The system carries the consistency. You carry the judgment.

Most of what goes wrong in a slide deck is mechanical, and Lattice
handles all of it. Contrast that meets WCAG AA, on every layout, in
light and dark — checked automatically, not left to chance. Headings
that resolve to the right size, spacing that holds, alignment that
falls where it should. You never spend judgment on any of it, because
none of it is a matter of judgment.

What's left is the part that is. Whether the claim is true. Whether the
slide earns its place. Whether the argument lands with this audience,
this quarter. No system checks those, and Lattice doesn't pretend to.
It clears the mechanical work off your desk so the only thing left in
front of you is the thinking. The machine owns what's correct; you own
what's good.

## Predictability is worth more than it looks

The same Markdown produces the same PDF — on your laptop, on a
colleague's, in a build server, this year and next. People notice this
property only when it's missing: the deck that reflows the night before
the meeting, the font
that renders one way on screen and another on the projector, the
"final-v7" that looks subtly different from "final-v6" and nobody can
say why.

Determinism is what lets you trust the artifact. The deck you reviewed
and approved is exactly the deck that opens in the room — you can put
your name on it without re-reading every slide. It's also what makes
the rest possible: you can't review a moving target, can't diff one,
can't safely hand one off to a colleague or an assistant. The real cost
of an unpredictable tool isn't the
occasional surprise. It's the vigilance you pay, forever, guarding
against one.

## You don't memorize it; it shows you

A new vocabulary reads as overhead: layout names, slot rules, a
four-layer model to memorize. You're not meant to memorize any of it.

The floor is Markdown, which you already know. A plain text file with
no Lattice vocabulary still renders as a clean deck; you add a layout
name when you want one, one at a time, with no cliff to fall off. From
there the system surfaces itself. Your editor autocompletes the
layouts. The gallery shows you each one rendered before you pick it. A
linter flags the handful of real footguns as you type, in the editor
and in the browser, with the very same checks the engine runs.

And then there's the assistant. Because a Lattice deck is structured
text under a named system, an AI can read the catalog and map plain
English onto it: you say "show these four options as a grid," and it
knows the layout, the nesting, the things that trip people up. The
structure that looks like the cost of learning Lattice is exactly what
lets a machine carry the learning for you. The vocabulary isn't a tax
you pay. It's the language the tools — and the assistant — already
speak.

## A deck outlives the meeting

Most tools treat a deck as finished the moment it's sent. But a board
deck comes back: next quarter with new numbers, restyled when the brand
changes, reopened when someone questions a figure. The first draft is a
small part of its life. The longer
part belongs to editors and maintainers, and Lattice is built for them
as much as for the author.

Because the deck is plain text under a stable structure, every later
change stays small and legible. An editor updates the numbers without
touching the claim. A maintainer reskins a hundred decks from one
palette file and trusts the regression tests to catch anything that
moved. The same assistant that helped write the deck can read it back —
summarize it, check its claims, find the slide that's gone stale —
because the structure that made it writable makes it readable.

The rule from before holds across all of it. Automation keeps a deck
well-formed. Whether it stays true is a person's call. An AI can hold a
deck to its own standard forever and never notice the quarter's story
changed. That part stays with you.

## Constraint is what frees you

Some people hear all this and worry that a system flattens the craft —
that making slides is an art, and an engine that picks the layout takes
the art away. It's a fair worry, and worth answering directly.

Start with what's true. There is real craft in a good deck, and there
is a real risk that everything starts to look the same. Neither is in
dispute.

But look at where the craft lives. Most of what feels artful in a slide
tool is fighting the tool — nudging a box into line, hunting down the
right hex code, redoing all of it when the brand changes. That's
not art. It's labor that feels like art because it's slow and fiddly.
Lattice takes that away and touches none of the decisions that actually
are creative: what the slide should say, what to cut, how the argument
is paced, which of the seven jobs this moment needs. The craft doesn't
disappear. It moves — out of nudging boxes and into the words and the
visual system, where one good decision pays off across a thousand
slides. Markdown didn't make writing less of an art. It moved the
typography into the stylesheet and left the writer with the words.

"Everything looks the same" is really two worries. Inside one company,
decks looking alike is the goal — that's what a brand is. Across
companies, the look is yours to set: a theme is a full visual identity,
not a color swap, and two themes diverge as far as two websites do. The
one real version of the worry is the lazy one — everybody shipping on
the default theme, the way the early web all ran on the same template.
The answer is to make your own theme cheap to build and deep to change.
Whether you take that up is a choice the engine can't make for you.

Consistency and creativity work on different layers. One is the
foundation; the other is what you build on it. A sonnet's fourteen
lines never cost a poet anything. A strong grid has freed
designers for a century. Lattice is that grid, for decks.

## You practice board-ready before you're in the room

"Boardroom-quality" sounds like a standard reserved for boards. It
isn't. The higher you go, the more polish and professionalism are
expected as a matter of course — and you don't reach that level by
waiting until you're there. You practice it on the way up. You don't
have to be presenting to the board to present like you are.

What's usually missing is time, not the standard — the gap between what
the standard asks and what someone early in their career can produce in
the hours they have. Lattice closes that gap. An analyst's first
proposal can carry the same finish as the partner's board deck, so
finish stops standing in for seniority and the argument does the
talking instead. And the habit gets cheap enough to keep: you hold the
line on every memo, not only the high-stakes one once a quarter. That
practice, repeated, is how you become the person who's ready before
anyone hands you the room.

## Where to go next

- [The design system](https://github.com/slidewright/lattice/blob/main/design/design-system.md) —
  the full four-layer model, in depth.
- [Author decks](/lattice/guides/authoring/) — the layout catalog and
  the authoring contract.
- [Browse components](/lattice/components/) — every layout, themable in
  any palette.
