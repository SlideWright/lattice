// The Drawing Board — the Architect's chat surface (Phase 2, Slice 7).
//
// A real conversation with the Architect, persisted per deck (the chats/messages
// IndexedDB stores). The model PHRASES; it never owns correctness — every reply
// is grounded in the deck + the deterministic findings handed in, and when no
// on-device model is loaded the composer still answers usefully from the
// deterministic assessment (the floor). See the Phase 2 build decision doc.
//
// Verified headless via a MockBackend (stream-render + persist + resume); the
// live phrasing path needs a capable Chrome/Edge — the panel says so when it's
// running model-free.

import { applyEdit, diffLines, EDIT_PROTOCOL, numberSlides, parseEdits, sliceSlide } from './architect-edits.js';
import { buildLatticePrimer } from './architect-knowledge.js';

const MAX_DECK_CHARS = 1200; // a short excerpt — a small model drowns in a full deck
const RICH_DECK_CHARS = 16000; // the cloud tier (Claude) reads the whole deck, not a peek

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Build the model messages: a system brief, the score + findings as grounding,
// the recent REAL conversation, then the new turn. Two shapes by tier:
//
//   - LEAN (local/small models): a short brief + a deck PEEK (~1200 chars). A
//     long prompt + the full deck makes a small model ramble.
//   - RICH (`rich:true`, the Puter/Claude cloud tier): a Lattice primer (so it
//     stops giving generic advice and knows the real `_class` layouts) + the
//     WHOLE deck. A capable model wants the full picture, not a peek.
//
// Deterministic messages (floor replies, the greeting — marked `det`) are dropped
// from history so a small model doesn't parrot our own boilerplate (the cause of
// the degenerate "load on-device AI…" loop seen on-device). Pure string assembly.
export function buildChatMessages({ source, assessment, history, userText, catalog, rich }) {
  const deck = (source || '').slice(0, rich ? RICH_DECK_CHARS : MAX_DECK_CHARS).trim();
  const findings = (assessment?.findings || [])
    .slice(0, rich ? 12 : 5)
    .map((f) => `- ${f.message}${f.slide ? ` (slide ${f.slide})` : ''}`)
    .join('\n');
  const score = assessment?.scorecard
    ? `The deck scores ${assessment.scorecard.band} (${assessment.scorecard.overall}/100).`
    : '';

  let system;
  if (rich) {
    const numbered = numberSlides(deck);
    system =
      'You are the Architect, a sharp presentation partner inside the Lattice Drawing Board. ' +
      'Help the author improve THIS deck — structure, the ask, pacing, wording, and the right ' +
      'layout for each slide. Be specific and concrete: refer to slides by number and to layouts ' +
      'by their exact `_class` name. Ground every point in the deck and the findings below — ' +
      'never invent facts about the author’s content.\n\n' +
      `${buildLatticePrimer(catalog)}\n\n` +
      `${EDIT_PROTOCOL}\n\n` +
      `${score}\n${findings ? `Mechanical issues the deterministic review found:\n${findings}\n` : 'No mechanical issues found.\n'}` +
      (numbered ? `\nThe current deck (each slide tagged [slide N] — address slides by that number; never copy the marker into an edit body):\n${numbered}` : '');
  } else {
    system =
      'You are the Architect, a sharp, friendly presentation coach. Answer in 1–3 short, ' +
      'concrete sentences. Do not repeat yourself or restate the question. Refer to slides ' +
      'by number. You advise; the app makes the edits. Base advice on the deck and issues below.\n\n' +
      `${score}\n${findings ? `Issues found:\n${findings}\n` : 'No mechanical issues found.\n'}` +
      (deck ? `\nDeck:\n${deck}` : '');
  }

  const turns = (history || [])
    .filter((m) => !m.det) // drop deterministic floor/greeting — model would parrot it
    .slice(-6)
    .map((m) => ({ role: m.role === 'architect' ? 'assistant' : 'user', content: m.content }));
  return [{ role: 'system', content: system }, ...turns, { role: 'user', content: userText }];
}

// The deterministic floor reply — no model, but NOT a single canned string. It
// reads the author's question and routes to the relevant deterministic answer
// (why it's model-free, the scorecard, a named slide, the top fixes), so a real
// back-and-forth still feels responsive on a browser without on-device AI (most
// phones). Honest about being model-free where that's the actual question; it
// doesn't pretend to converse about things the engines can't see. Pure + tested.
function scoreLine(sc) {
  return `your deck scores ${sc.band} (${sc.overall}/100)`;
}
function mustFix(assessment, n = 3) {
  return (assessment?.findings || []).filter((f) => f.severity !== 'suggestion').slice(0, n);
}
function listFindings(findings) {
  return findings.map((f) => `• ${f.message}${f.slide ? ` (slide ${f.slide})` : ''}`).join('\n');
}

export function floorReply(assessment, userText = '') {
  const sc = assessment?.scorecard;
  const q = String(userText).toLowerCase();
  const enable = 'Want a real back-and-forth? Tap the ⚙ chip up top and load on-device AI — there’s a compact universal option (~350 MB) that runs right here in your browser, no special browser or GPU needed. It stays on your device.';

  // "why are you model-free / how do I enable it" — answer the actual question.
  if (/\b(why|model[\s-]?free|no model|offline|enable|turn on|switch on|activate|on-device|gpu|download|nano|webllm|transformers)\b/.test(q)) {
    return "I'm running deterministically because no on-device model is loaded in this browser yet. There are three tiers: the built-in AI (instant, but only recent Chrome/Edge expose it), a compact universal model that runs anywhere via WebAssembly (a one-time ~350 MB download — this is the one for Safari and phones), and an advanced WebLLM tier for WebGPU desktops. " +
      'None of that changes the review — scores, findings and fixes are computed the same way regardless. ' + enable;
  }

  if (!sc) {
    return "There’s no deck to look at yet — start writing and I’ll score it and flag anything off as you go. " +
      "(I’m running model-free in this browser, so I answer from that live review rather than free-form chat. " + enable + ')';
  }

  // A specific slide — surface that slide's findings.
  const slideM = q.match(/slide\s*(\d+)/);
  if (slideM) {
    const n = Number(slideM[1]);
    const on = (assessment.findings || []).filter((f) => f.slide === n);
    if (on.length) return `On slide ${n}:\n${listFindings(on)}\n\nThat’s what the deterministic review sees. ${enable}`;
    return `Slide ${n} looks clean to the review — no contract or clarity flags on it. ${enable}`;
  }

  // Fixes / improvement — lead with the actionable findings.
  if (/\b(fix|improve|better|tighten|sharpen|stronger|strengthen|weak|wrong|issue|problem)\b/.test(q)) {
    const fixes = mustFix(assessment, 4);
    if (fixes.length) return `Here’s what I’d fix first (${scoreLine(sc)}):\n${listFindings(fixes)}\n\nEach is also flagged in the review above with a Reveal / How-to-fix. ${enable}`;
    return `Nothing mechanical is flagged — ${scoreLine(sc)} and every slide follows the authoring contract. For wording and flow, ${enable.charAt(0).toLowerCase() + enable.slice(1)}`;
  }

  // Greeting.
  if (/^\s*(hi|hey|hello|yo|sup|good (morning|afternoon|evening))\b/.test(q)) {
    return `Hey. I’ve got your deck up — ${scoreLine(sc)}. Ask me what to fix, or about a specific slide, and I’ll tell you what the review sees. ${enable}`;
  }

  // Default: thoughts / review / score / anything else — the assessment.
  const issues = mustFix(assessment, 3);
  return `Here’s my read, ${scoreLine(sc)}: ` +
    (issues.length ? `the things I’d fix first —\n${listFindings(issues)}\n\n` : 'nothing mechanical is broken, every slide follows the contract. ') +
    `Ask me about a specific slide or "what should I fix" for more. ${enable}`;
}

export function createChat({ mount, composer, model, store, getAssessment, catalog, applyFix, getSource }) {
  if (!mount || !composer) return { reload() {}, focus() {} };
  let deckId = store?.getActiveId ? store.getActiveId() : null;
  let busy = false;

  const input = composer.querySelector('textarea');
  const sendBtn = composer.querySelector('button[type="submit"]');

  function bubble(role, text) {
    const b = el('div', `db-msg db-msg-${role === 'architect' ? 'architect' : 'user'}`);
    b.append(el('span', 'db-msg-who', role === 'architect' ? 'the Architect' : 'You'));
    b.append(el('div', 'db-msg-body', text));
    mount.appendChild(b);
    return b.querySelector('.db-msg-body');
  }
  function scrollDown() { mount.scrollTop = mount.scrollHeight; }

  // ── proposed-edit cards (Slice B): a reviewable diff + one-click Apply ────────
  // The model proposes; nothing changes until the author clicks Apply. The edit
  // splices into the LIVE editor source, which re-renders and re-scores via the
  // existing onEdit path — so a bad edit shows up in Coach immediately. Pure core
  // (parse/splice/diff) is architect-edits.js; this is just the DOM.
  function editLabel(edit) {
    if (edit.action === 'replace') return `Replace slide ${edit.slide}`;
    if (edit.action === 'delete') return `Delete slide ${edit.slide}`;
    if (edit.slide <= 0) return 'Insert a slide at the top';
    if (edit.slide >= Number.MAX_SAFE_INTEGER) return 'Insert a slide at the end';
    return `Insert a slide after ${edit.slide}`;
  }
  function editCard(edit) {
    const card = el('div', 'db-edit-card');
    card.append(el('div', 'db-edit-head', editLabel(edit)));

    const before = edit.action === 'insert' ? '' : sliceSlide(getSource ? getSource() : '', edit.slide);
    const after = edit.action === 'delete' ? '' : (edit.body || '').trim();
    const diff = el('div', 'db-edit-diff');
    for (const row of diffLines(before, after)) {
      const sign = row.type === 'add' ? '+ ' : row.type === 'del' ? '− ' : '  ';
      diff.append(el('div', `db-diff-${row.type}`, sign + row.text));
    }
    card.append(diff);

    const actions = el('div', 'db-edit-actions');
    const apply = el('button', 'db-btn db-btn-primary', 'Apply');
    apply.type = 'button';
    const dismiss = el('button', 'db-btn', 'Discard');
    dismiss.type = 'button';
    apply.addEventListener('click', () => {
      if (!getSource || !applyFix) return;
      applyFix(applyEdit(getSource(), edit));
      card.classList.add('is-applied');
      apply.disabled = true;
      apply.textContent = '✓ Applied';
      dismiss.textContent = 'Dismiss';
    });
    dismiss.addEventListener('click', () => card.remove());
    actions.append(apply, dismiss);
    card.append(actions);
    return card;
  }
  function renderEditCards(bodyEl, edits) {
    const msg = bodyEl.closest('.db-msg') || bodyEl.parentElement;
    const host = el('div', 'db-edit-cards');
    for (const edit of edits) host.append(editCard(edit));
    msg.append(host);
    scrollDown();
  }

  function emptyState() {
    mount.innerHTML = '';
    const a = model?.availability ? model.availability() : { generation: 'floor' };
    const note = el('p', 'db-chat-empty');
    note.textContent = a.generation === 'floor'
      ? 'Ask the Architect about your deck. (Running model-free — answers come from the live review until you enable on-device AI.)'
      : 'Ask the Architect about your deck — structure, the ask, pacing, a specific slide.';
    mount.appendChild(note);
  }

  async function reload() {
    deckId = store?.getActiveId ? store.getActiveId() : null;
    mount.innerHTML = '';
    const msgs = deckId && store?.chatMessages ? await store.chatMessages(deckId) : [];
    if (!msgs.length) { emptyState(); return; }
    for (const m of msgs) bubble(m.role, m.content);
    scrollDown();
  }

  async function send(text) {
    if (busy || !text.trim()) return;
    busy = true;
    if (sendBtn) sendBtn.disabled = true;
    if (mount.querySelector('.db-chat-empty')) mount.innerHTML = '';
    bubble('user', text);
    scrollDown();
    if (deckId && store?.addChatMessage) await store.addChatMessage(deckId, 'user', text);

    const assessment = getAssessment ? getAssessment() : null;
    const floor = floorReply(assessment, text);
    // Immediate "working" feedback, so you're never left wondering. On-device
    // tiers are slow, so the label sets expectations; the first streamed token
    // swaps it for the reply (the worker keeps the UI live so this animates).
    const a = model?.availability ? model.availability() : { generation: 'floor' };
    const slow = a.generation === 'transformers' || a.generation === 'webllm';
    const target = bubble('architect', slow ? 'Thinking on-device — this can take a few seconds…' : 'Thinking…');
    target.classList.add('db-msg-thinking');
    let full = '';
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      target.classList.remove('db-msg-thinking');
      target.classList.add('is-streaming');
      target.textContent = '';
    };
    try {
      // The cloud tier (Puter/Claude) gets the rich, Lattice-aware prompt + the
      // whole deck; the small local model keeps the lean peek so it doesn't ramble.
      const messages = buildChatMessages({
        source: assessment?.source, assessment, history: await thread(), userText: text,
        catalog, rich: a.generation === 'puter',
      });
      const out = await model.complete({
        messages,
        fallback: floor,
        onToken: (tok) => { begin(); full += tok; target.textContent = full; scrollDown(); },
      });
      full = (out && String(out)) || full || floor;
    } catch {
      full = floor;
    }
    begin(); // ensure the thinking state clears even if nothing streamed
    target.textContent = full;
    target.classList.remove('is-streaming');

    // On the cloud tier, the reply may carry proposed EDIT BLOCKS — lift them into
    // reviewable diff cards and show only the prose in the bubble. Stored history
    // keeps the prose (the change lives in the deck once applied), so reloading the
    // thread never re-offers a stale apply.
    let stored = full;
    if (a.generation === 'puter' && full && full !== floor) {
      const { text, edits } = parseEdits(full);
      if (edits.length) {
        stored = text || '(proposed a deck edit)';
        target.textContent = stored;
        renderEditCards(target, edits);
      }
    }
    // Mark deterministic replies (floor / model-fell-to-floor) so they're NOT fed
    // back to the model as history — that's what made the small model parrot itself.
    const det = !(a.generation !== 'floor' && full && full.trim() && full !== floor);
    if (deckId && store?.addChatMessage) await store.addChatMessage(deckId, 'architect', stored, det);
    busy = false;
    if (sendBtn) sendBtn.disabled = false;
    scrollDown();
  }

  async function thread() {
    return deckId && store?.chatMessages ? await store.chatMessages(deckId) : [];
  }

  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    autosize();
    send(text);
  });
  // Enter sends; Shift+Enter is a newline. (Mobile keyboards send a newline, so
  // the send button is the primary affordance there.)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      composer.requestSubmit ? composer.requestSubmit() : send(input.value);
    }
  });
  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(120, input.scrollHeight) + 'px';
  }
  input.addEventListener('input', autosize);

  // Post an Architect message into the thread without a user turn — used by the
  // onboarding so the Architect actually "talks back" when it starts a deck
  // (Freehand / Drafting), instead of silently dropping you into the editor.
  // Re-derives the active deck so it lands in the right thread after a create.
  async function say(text) {
    if (!text) return;
    deckId = store?.getActiveId ? store.getActiveId() : deckId;
    const note = mount.querySelector('.db-chat-empty');
    if (note) note.remove();
    bubble('architect', text);
    scrollDown();
    if (deckId && store?.addChatMessage) await store.addChatMessage(deckId, 'architect', text, true);
  }

  // Reload the thread whenever the active deck changes.
  window.addEventListener('db-active-deck', reload);

  reload();
  return { reload, focus: () => input.focus(), send, say };
}
