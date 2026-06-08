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

// The deterministic floor reply — honest about running model-free, but still
// useful: it hands back the assessment the engines already computed.
export function floorReply(assessment) {
  const sc = assessment?.scorecard;
  if (!sc) {
    return "I'm running model-free right now (no on-device AI loaded), so I can't " +
      'chat freely yet — but I review every edit live above. Start a deck and I’ll ' +
      'flag anything off. Enable on-device AI for a back-and-forth.';
  }
  const issues = (assessment.findings || []).filter((f) => f.severity !== 'suggestion').slice(0, 3);
  const lines = issues.map((f) => `• ${f.message}${f.slide ? ` (slide ${f.slide})` : ''}`).join('\n');
  return `Running model-free, but here’s what I can tell you for sure: your deck scores ` +
    `${sc.band} (${sc.overall}/100). ` +
    (lines ? `The things I’d fix first:\n${lines}\n\n` : 'Nothing mechanical is broken. ') +
    'Enable on-device AI (a capable Chrome/Edge) and I can talk it through with you.';
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
    const target = bubble('architect', '');
    target.classList.add('is-streaming');
    let full = '';
    try {
      const messages = buildChatMessages({
        source: assessment?.source, assessment, history: await thread(), userText: text,
      });
      const out = await model.complete({
        messages,
        fallback: floorReply(assessment),
        onToken: (tok) => { full += tok; target.textContent = full; scrollDown(); },
      });
      full = (out && String(out)) || full || floorReply(assessment);
    } catch {
      full = floorReply(assessment);
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
