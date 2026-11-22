// render.js — draws every screen of the duel into the DOM: title, table,
// win and loss. Cards are plain HTML so their values stay readable.
import { ELEMENTS, cardDef } from "./cards.js";
import { MAX_TABLE } from "./state.js";

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

function elementBadge(element) {
  const e = ELEMENTS[element];
  const b = el("span", "elem-badge", `${e.glyph} ${e.name}`);
  b.style.setProperty("--elem", e.color);
  b.style.setProperty("--elem-dark", e.dark);
  return b;
}

export function cardNode(card, opts = {}) {
  const def = cardDef(card.defId);
  const e = ELEMENTS[def.element];
  const node = el("div", "card" + (opts.mini ? " mini" : ""));
  node.dataset.uid = card.uid;
  if (opts.playable) node.classList.add("playable");
  if (opts.selected) node.classList.add("selected");
  if (opts.canAttack) node.classList.add("can-attack");
  if (opts.exhausted) node.classList.add("exhausted");
  if (opts.dealt) node.classList.add("dealt");
  node.style.setProperty("--elem", e.color);
  node.style.setProperty("--elem-dark", e.dark);

  const cost = el("div", "cost", String(def.cost));
  cost.title = "Mana cost";
  const elem = el("div", "card-elem", e.glyph);
  elem.title = e.name;
  const art = el("div", "art", def.art);
  const name = el("div", "card-name", def.name);
  const text = el("div", "card-text", def.text);
  node.append(cost, elem, art, name, text);
  if (def.kind === "creature") {
    const stats = el("div", "stats");
    stats.append(el("span", "atk", `⚔ ${card.atk ?? def.atk}`), el("span", "hp", `♥ ${card.hp ?? def.hp}`));
    node.append(stats);
  } else {
    const tag = el("div", "spell-tag", "SPELL");
    node.append(tag);
  }
  return node;
}

function cardBackNode() {
  const node = el("div", "card back");
  node.append(el("div", "back-art", "🌊"), el("div", "back-name", "TIDE"));
  return node;
}

function heroNode(side, name, subtitle, isFoe, game) {
  const wrap = el("div", "hero" + (isFoe ? " foe" : " you"));
  const portrait = el("div", "portrait", isFoe ? "🔥" : "🌊");
  const info = el("div", "hero-info");
  const nm = el("div", "hero-name", name);
  const sub = el("div", "hero-sub", subtitle);
  const life = el("div", "life", `♥ ${Math.max(0, side.life)}`);
  life.title = "Life total";
  const mana = el("div", "mana", `◆ ${side.mana}/${side.maxMana}`);
  mana.title = "Mana crystals";
  const deck = el("div", "deck-count", `🂠 ${side.deck.length}`);
  deck.title = "Cards left in deck";
  info.append(nm, sub, life, mana, deck);
  wrap.append(portrait, info);
  wrap.dataset.hero = side.who;
  if (game.phase === "player" && game.selectedAttacker) wrap.classList.add("targetable");
  if (game.phase === "player" && game.selectedHand) {
    const def = cardDef(game.you.hand.find((c) => c.uid === game.selectedHand)?.defId ?? "");
    if (def && def.id === "surge-bolt") wrap.classList.add("targetable");
  }
  return wrap;
}

export function renderTitle(root, onStart, wins, losses) {
  root.innerHTML = "";
  const screen = el("div", "screen title-screen");
  const badge = el("div", "title-badge", "A CARD DUEL OF ELEMENTS");
  const title = el("h1", "game-title");
  title.innerHTML = "TIDECALLER<br>DUEL";
  const tagline = el("p", "tagline", "Summon creatures of Flame, Tide, Leaf and Stone. Outwit Kess, the Ember Warden, and take her 30 life before she takes yours.");
  const rules = el("div", "rules-box");
  rules.append(
    el("h2", null, "How to play"),
    ruleLine("🂠", "Each turn you draw a card and gain a mana crystal (up to 10). Play cards by clicking them, then a target."),
    ruleLine("⚔", "Creatures attack once a turn, starting the turn after they are summoned. Click one of yours, then an enemy creature or Kess herself."),
    ruleLine("▲ ● ◆ ■", "Elements matter: Flame beats Leaf, Leaf beats Tide, Tide beats Stone, Stone beats Flame — +2 attack on a winning strike."),
    ruleLine("♥", "Reduce Kess to 0 life to win. If your life hits 0, the tide claims you."),
    ruleLine("⌨", "Keyboard: 1–7 select a hand card, Enter ends your turn, Esc cancels a selection."),
  );
  const start = el("button", "big-btn", "▶  Begin the Duel");
  start.addEventListener("click", onStart);
  const score = el("div", "title-score", `Duels won: ${wins}  ·  Duels lost: ${losses}`);
  const foot = el("div", "title-foot", "An original game — no network, no account, just the table.");
  screen.append(badge, title, tagline, rules, start, score, foot);
  root.append(screen);
  start.focus();
}

function ruleLine(icon, text) {
  const row = el("div", "rule-line");
  row.append(el("span", "rule-icon", icon), el("span", null, text));
  return row;
}

export function renderTable(root, game, handlers) {
  root.innerHTML = "";
  const table = el("div", "table");

  // Top bar: title, turn, score, buttons.
  const top = el("div", "topbar");
  const brand = el("div", "brand", "🌊 TIDECALLER DUEL");
  const turn = el("div", "turn-info", `Turn ${game.turn} — ${game.phase === "player" ? "Your turn" : game.phase === "ai" ? "Kess's turn" : "Duel over"}`);
  const score = el("div", "score", `Score — You ${game.wins} · Kess ${game.losses}`);
  const endBtn = el("button", "end-btn", game.phase === "player" ? "End Turn ⏎" : "Kess is playing…");
  endBtn.disabled = game.phase !== "player";
  endBtn.addEventListener("click", handlers.onEndTurn);
  const soundBtn = el("button", "icon-btn", handlers.muted ? "🔇" : "🔊");
  soundBtn.title = "Toggle sound";
  soundBtn.addEventListener("click", handlers.onToggleSound);
  const newBtn = el("button", "icon-btn", "↺ New");
  newBtn.title = "Start a new duel";
  newBtn.addEventListener("click", handlers.onNewGame);
  top.append(brand, turn, score, endBtn, soundBtn, newBtn);
  table.append(top);

  // Opponent row: hero + face-down hand + table.
  const foeRow = el("div", "side foe-side");
  foeRow.append(heroNode(game.foe, "Kess, Ember Warden", "Rival Tidecaller", true, game));
  const foeHand = el("div", "hand foe-hand");
  for (let i = 0; i < game.foe.hand.length; i++) foeHand.append(cardBackNode());
  const foeCount = el("div", "hand-count", `${game.foe.hand.length} cards in hand`);
  foeRow.append(foeHand, foeCount);
  table.append(foeRow);

  const foeTable = el("div", "battle-row foe-table");
  if (game.foe.table.length === 0) foeTable.append(el("div", "empty-slot", "Kess has no creatures on the table — yet."));
  for (const c of game.foe.table) {
    const node = cardNode(c, { mini: true });
    node.addEventListener("click", () => handlers.onFoeCreature(c));
    if (game.selectedAttacker || game.selectedHand) node.classList.add("targetable");
    foeTable.append(node);
  }
  table.append(foeTable);

  // Middle: message + log + element legend.
  const mid = el("div", "midbar");
  const msg = el("div", "message", game.message);
  const legend = el("div", "legend");
  for (const key of ["flame", "leaf", "tide", "stone"]) {
    legend.append(elementBadge(key));
    if (key !== "stone") legend.append(el("span", "legend-beats", "beats"));
  }
  const log = el("div", "log");
  for (const line of game.log) log.append(el("div", "log-line", line));
  mid.append(msg, legend, log);
  table.append(mid);

  // Player table row.
  const youTable = el("div", "battle-row you-table");
  if (game.you.table.length === 0) {
    youTable.append(el("div", "empty-slot", "Your creatures will stand here. Play a card from your hand!"));
  }
  for (const c of game.you.table) {
    const node = cardNode(c, {
      mini: true,
      canAttack: game.phase === "player" && c.canAttack,
      exhausted: !c.canAttack,
      selected: game.selectedAttacker === c.uid,
    });
    node.addEventListener("click", () => handlers.onYouCreature(c));
    youTable.append(node);
  }
  table.append(youTable);

  // Player row: hero + hand.
  const youRow = el("div", "side you-side");
  youRow.append(heroNode(game.you, "You, the Tidecaller", "Hero of the Blue Tide", false, game));
  const youHand = el("div", "hand you-hand");
  game.you.hand.forEach((card, i) => {
    const def = cardDef(card.defId);
    const playable = game.phase === "player" && game.you.mana >= def.cost &&
      (def.kind !== "creature" || game.you.table.length < MAX_TABLE);
    const node = cardNode(card, {
      playable,
      selected: game.selectedHand === card.uid,
      dealt: true,
    });
    node.style.animationDelay = `${i * 60}ms`;
    node.addEventListener("click", () => handlers.onHandCard(card));
    node.title = `${def.name} — ${i + 1} to select`;
    youHand.append(node);
  });
  youRow.append(youHand);
  const hint = el("div", "hint", "Click a card to play it · click one of your creatures, then a target, to attack · 1–7 select · Enter ends turn");
  youRow.append(hint);
  table.append(youRow);

  root.append(table);

  // Hero click targets (attack face / surge bolt at hero).
  for (const heroEl of root.querySelectorAll(".hero")) {
    heroEl.addEventListener("click", () => handlers.onHero(heroEl.dataset.hero));
  }
}

export function renderEnd(root, game, onAgain, onTitle) {
  root.innerHTML = "";
  const won = game.screen === "win";
  const screen = el("div", "screen end-screen " + (won ? "win-screen" : "loss-screen"));
  if (won) {
    const confetti = el("div", "confetti");
    for (let i = 0; i < 36; i++) {
      const piece = el("span", "confetti-piece");
      piece.style.left = `${(i * 29) % 100}%`;
      piece.style.animationDelay = `${(i % 12) * 0.12}s`;
      piece.style.background = ["#e8542f", "#2f7fe8", "#3da35d", "#c98a2e", "#f2d13d"][i % 5];
      confetti.append(piece);
    }
    screen.append(confetti);
  }
  const big = el("h1", "end-title", won ? "🏆 VICTORY!" : "🌊 DEFEAT");
  const sub = el("p", "end-sub", won
    ? "Kess bows to the Tidecaller. The tide is yours — 30 life to 0, and the table remembers it."
    : "Kess claims the tide… this time. Shuffle the deck, learn the elements, and challenge her again.");
  const tally = el("div", "end-tally");
  tally.append(
    el("div", "tally-cell", `Your life: ${Math.max(0, game.you.life)}`),
    el("div", "tally-cell", `Kess's life: ${Math.max(0, game.foe.life)}`),
    el("div", "tally-cell", `Turns played: ${game.turn}`),
    el("div", "tally-cell", `Duels — You ${game.wins} · Kess ${game.losses}`),
  );
  const again = el("button", "big-btn", "↺  Duel Again");
  again.addEventListener("click", onAgain);
  const toTitle = el("button", "ghost-btn", "Back to Title");
  toTitle.addEventListener("click", onTitle);
  screen.append(big, sub, tally, again, toTitle);
  root.append(screen);
  again.focus();
}
