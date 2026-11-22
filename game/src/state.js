// state.js — the duel's state and rules: turns, mana, drawing, fatigue,
// playing cards, combat with elemental advantage, win and loss detection.
import { buildDeck, cardDef, elementBeats, newCreature } from "./cards.js";

export const MAX_HAND = 7;
export const MAX_TABLE = 5;
export const START_LIFE = 30;
export const MAX_MANA = 10;

export function createGame(seed) {
  let s = seed >>> 0 || 1;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const game = {
    seed,
    turn: 1,
    phase: "player", // "player" | "ai" | "over"
    screen: "game", // "title" | "game" | "win" | "loss"
    log: [],
    you: freshSide("you", rng),
    foe: freshSide("foe", rng),
    winner: null,
    wins: 0,
    losses: 0,
    selectedHand: null, // uid of selected hand card
    selectedAttacker: null, // uid of selected own creature
    message: "Your turn — play a card or attack!",
  };
  drawCards(game, game.you, 3);
  drawCards(game, game.foe, 3);
  return game;
}

function freshSide(who, rng) {
  return {
    who,
    life: START_LIFE,
    mana: 1,
    maxMana: 1,
    deck: buildDeck(rng),
    hand: [],
    table: [],
    fatigue: 0,
  };
}

export function drawCards(game, side, n) {
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) {
      side.fatigue += 1;
      side.life -= side.fatigue;
      addLog(game, `${side.who === "you" ? "You" : "Kess"} run out of cards — fatigue ${side.fatigue} damage!`);
      checkEnd(game);
      if (game.phase === "over") return;
      continue;
    }
    const card = side.deck.pop();
    if (side.hand.length >= MAX_HAND) {
      addLog(game, `${side.who === "you" ? "Your" : "Kess's"} hand is full — a card burns away.`);
    } else {
      side.hand.push(card);
    }
  }
}

export function addLog(game, text) {
  game.log.unshift(text);
  if (game.log.length > 6) game.log.length = 6;
}

export function startPlayerTurn(game) {
  game.turn += 1;
  game.phase = "player";
  const you = game.you;
  you.maxMana = Math.min(MAX_MANA, you.maxMana + 1);
  you.mana = you.maxMana;
  for (const c of you.table) c.canAttack = true;
  drawCards(game, you, 1);
  if (game.phase !== "over") {
    game.message = `Turn ${game.turn} — your move!`;
    addLog(game, `Turn ${game.turn}: your mana rises to ${you.maxMana}.`);
  }
}

export function startAiTurn(game) {
  game.phase = "ai";
  const foe = game.foe;
  foe.maxMana = Math.min(MAX_MANA, foe.maxMana + 1);
  foe.mana = foe.maxMana;
  for (const c of foe.table) c.canAttack = true;
  drawCards(game, foe, 1);
  game.message = "Kess is thinking…";
}

export function endPlayerTurn(game) {
  if (game.phase !== "player") return;
  game.selectedHand = null;
  game.selectedAttacker = null;
  startAiTurn(game);
}

export function canPlayCard(game, side, card) {
  const def = cardDef(card.defId);
  if (def.kind === "creature" && side.table.length >= MAX_TABLE) return false;
  return side.mana >= def.cost;
}

export function playCard(game, side, cardUid, target) {
  const idx = side.hand.findIndex((c) => c.uid === cardUid);
  if (idx < 0) return false;
  const card = side.hand[idx];
  const def = cardDef(card.defId);
  if (!canPlayCard(game, side, card)) return false;
  side.mana -= def.cost;
  side.hand.splice(idx, 1);
  const who = side.who === "you" ? "You" : "Kess";
  if (def.kind === "creature") {
    const creature = newCreature(card.defId, side.who);
    side.table.push(creature);
    addLog(game, `${who} summon ${def.name} (${def.atk}/${def.hp}).`);
    game.message = `${who} summon ${def.name}!`;
  } else {
    castSpell(game, side, def, target);
  }
  checkEnd(game);
  return true;
}

function castSpell(game, side, def, target) {
  const who = side.who === "you" ? "You" : "Kess";
  const foeSide = side.who === "you" ? game.foe : game.you;
  if (def.id === "surge-bolt") {
    dealDamage(game, target, 3);
    addLog(game, `${who} hurl Surge Bolt for 3 damage.`);
  } else if (def.id === "tide-mend") {
    const healed = Math.min(6, START_LIFE - side.life);
    side.life += healed;
    addLog(game, `${who} mend ${healed} life.`);
    game.message = `${who} restore ${healed} life!`;
  } else if (def.id === "gale-draw") {
    drawCards(game, side, 2);
    addLog(game, `${who} draw 2 cards on the gale.`);
  } else if (def.id === "ember-nova") {
    for (const c of [...foeSide.table]) dealDamage(game, c, 2);
    addLog(game, `${who} unleash Ember Nova — 2 damage to every enemy creature!`);
    game.message = "Ember Nova scorches the enemy line!";
  }
  checkEnd(game);
}

export function effectiveAttack(attacker, defender) {
  const a = cardDef(attacker.defId);
  const d = cardDef(defender.defId);
  return a.atk + (elementBeats(a.element, d.element) ? 2 : 0);
}

export function attackCreature(game, attacker, defender) {
  if (!attacker.canAttack) return false;
  const a = cardDef(attacker.defId);
  const d = cardDef(defender.defId);
  const adv = elementBeats(a.element, d.element);
  const dmgToDef = effectiveAttack(attacker, defender);
  const dmgToAtk = d.atk + (elementBeats(d.element, a.element) ? 2 : 0);
  attacker.canAttack = false;
  dealDamage(game, defender, dmgToDef);
  dealDamage(game, attacker, dmgToAtk);
  const who = attacker.owner === "you" ? "Your" : "Kess's";
  addLog(
    game,
    `${who} ${a.name} strikes ${d.name} for ${dmgToDef}${adv ? " (elemental advantage!)" : ""}, taking ${dmgToAtk} back.`,
  );
  checkEnd(game);
  return true;
}

export function attackHero(game, attacker) {
  if (!attacker.canAttack) return false;
  const a = cardDef(attacker.defId);
  const foeSide = attacker.owner === "you" ? game.foe : game.you;
  attacker.canAttack = false;
  foeSide.life -= a.atk;
  const who = attacker.owner === "you" ? "Your" : "Kess's";
  addLog(game, `${who} ${a.name} hits the enemy hero for ${a.atk}!`);
  game.message = `${who} ${a.name} strikes the hero for ${a.atk}!`;
  checkEnd(game);
  return true;
}

export function dealDamage(game, target, amount) {
  if (!target) return;
  if (target.who !== undefined) {
    target.life -= amount; // hero side
  } else {
    target.hp -= amount; // creature
    if (target.hp <= 0) {
      const side = target.owner === "you" ? game.you : game.foe;
      const i = side.table.findIndex((c) => c.uid === target.uid);
      if (i >= 0) side.table.splice(i, 1);
      const def = cardDef(target.defId);
      addLog(game, `${def.name} shatters!`);
    }
  }
}

export function checkEnd(game) {
  if (game.phase === "over") return;
  if (game.you.life <= 0 && game.foe.life <= 0) {
    endGame(game, game.you.life === game.foe.life ? null : game.you.life > game.foe.life ? "you" : "foe");
  } else if (game.foe.life <= 0) {
    endGame(game, "you");
  } else if (game.you.life <= 0) {
    endGame(game, "foe");
  }
}

function endGame(game, winner) {
  game.phase = "over";
  game.winner = winner;
  if (winner === "you") {
    game.screen = "win";
    game.wins += 1;
    game.message = "Victory! Kess bows to the Tidecaller!";
    addLog(game, "You win the duel!");
  } else if (winner === "foe") {
    game.screen = "loss";
    game.losses += 1;
    game.message = "Defeat — Kess claims the tide… this time.";
    addLog(game, "Kess wins the duel.");
  } else {
    game.screen = "loss";
    game.message = "A draw — the tide takes you both.";
  }
}
