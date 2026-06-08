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

const MAX_DECK_CHARS = 4000; // keep the deck context small for the weakest tier

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Build the model messages: a tight system brief, the deck + deterministic
// findings as grounding, the recent history, then the new turn. Pure string
// assembly so the model only rephrases grounded facts.
export function buildChatMessages({ source, assessment, history, userText }) {
  const deck = (source || '').slice(0, MAX_DECK_CHARS);
  const findings = (assessment?.findings || [])
    .slice(0, 8)
    .map((f) => `- [${f.severity}] ${f.message}${f.slide ? ` (slide ${f.slide})` : ''}`)
    .join('\n');
  const score = assessment?.scorecard
    ? `Score: ${assessment.scorecard.band} (${assessment.scorecard.overall}/100).`
    : '';
  const system =
    'You are the Architect, a senior presentation coach inside Lattice. Help the ' +
    'author improve THIS deck: be concise, concrete, and kind. Refer to slides by ' +
    'number. Do NOT invent Lattice components, classes, or fixes — the engine owns ' +
    'edits; you advise. Ground every claim in the deck and the findings below.\n\n' +
    `${score}\nFindings:\n${findings || '(none — the deck is clean)'}\n\n` +
    `Deck source:\n${deck}`;
  const turns = (history || []).slice(-8).map((m) => ({ role: m.role === 'architect' ? 'assistant' : 'user', content: m.content }));
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
  const enable = 'Want a real back-and-forth? Tap the ⚙ chip up top and load on-device AI — there’s a universal option (~350 MB) that runs right here in your browser, no special browser or GPU needed. It stays on your device.';

  // "why are you model-free / how do I enable it" — answer the actual question.
  if (/\b(why|model[\s-]?free|no model|offline|enable|turn on|switch on|activate|on-device|gpu|download|nano|webllm|transformers)\b/.test(q)) {
    return "I'm running deterministically because no on-device model is loaded in this browser yet. There are three tiers: the built-in AI (instant, but only recent Chrome/Edge expose it), a universal model that runs anywhere via WebAssembly (a one-time ~350 MB download — this is the one for Safari and phones), and an advanced WebLLM tier for WebGPU desktops. " +
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

export function createChat({ mount, composer, model, store, getAssessment }) {
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
    const target = bubble('architect', '');
    target.classList.add('is-streaming');
    let full = '';
    try {
      const messages = buildChatMessages({
        source: assessment?.source, assessment, history: await thread(), userText: text,
      });
      const out = await model.complete({
        messages,
        fallback: floor,
        onToken: (tok) => { full += tok; target.textContent = full; scrollDown(); },
      });
      full = (out && String(out)) || full || floor;
    } catch {
      full = floor;
    }
    target.textContent = full;
    target.classList.remove('is-streaming');
    if (deckId && store?.addChatMessage) await store.addChatMessage(deckId, 'architect', full);
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

  // Reload the thread whenever the active deck changes.
  window.addEventListener('db-active-deck', reload);

  reload();
  return { reload, focus: () => input.focus(), send };
}
