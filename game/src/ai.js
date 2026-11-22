// ai.js — Kess, the Ember Warden: a readable, counterable opponent.
// Plays its biggest affordable cards first, answers the player's strongest
// creature when it can, and sends the rest of its line at the hero.
import { cardDef, elementBeats } from "./cards.js";
import { canPlayCard, playCard, attackCreature, attackHero } from "./state.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runAiTurn(game, hooks) {
  const foe = game.foe;
  const you = game.you;
  await sleep(500);

  // 1) Play cards: biggest cost first, but keep a Surge Bolt for a lethal threat.
  let played = true;
  while (played && game.phase === "ai") {
    played = false;
    const playable = foe.hand
      .filter((c) => canPlayCard(game, foe, c))
      .sort((a, b) => cardDef(b.defId).cost - cardDef(a.defId).cost);
    for (const card of playable) {
      const def = cardDef(card.defId);
      if (def.kind === "creature" && foe.table.length >= 5) continue;
      if (def.id === "tide-mend" && foe.life > 24) continue;
      if (def.id === "gale-draw" && foe.hand.length > 5) continue;
      if (def.id === "surge-bolt") {
        const bigThreat = [...you.table].sort((a, b) => cardDef(b.defId).atk - cardDef(a.defId).atk)[0];
        if (bigThreat && bigThreat.hp <= 3) {
          playCard(game, foe, card.uid, bigThreat);
          hooks.onAction();
          await sleep(450);
          played = true;
          break;
        }
        if (you.life <= 3 && foe.mana >= def.cost) {
          playCard(game, foe, card.uid, you);
          hooks.onAction();
          await sleep(450);
          played = true;
          break;
        }
        continue;
      }
      if (def.id === "ember-nova" && you.table.length < 2) continue;
      const target = def.id === "tide-mend" ? foe : null;
      playCard(game, foe, card.uid, target);
      hooks.onAction();
      await sleep(450);
      played = true;
      break;
    }
  }
  if (game.phase !== "ai") return;

  // 2) Attack: each ready creature picks its best target.
  for (const attacker of [...foe.table]) {
    if (game.phase !== "ai" || !attacker.canAttack) continue;
    const aDef = cardDef(attacker.defId);
    // A creature it can kill, preferring one it has advantage over.
    const killable = you.table
      .filter((d) => effectiveVs(attacker, d) >= d.hp)
      .sort((x, y) => cardDef(y.defId).atk - cardDef(x.defId).atk)[0];
    if (killable && (you.table.length > 1 || attacker.atk < you.life)) {
      attackCreature(game, attacker, killable);
    } else if (you.table.length > 0 && attacker.hp <= 1 && Math.random() < 0.5) {
      // A dying creature trades instead of going face.
      const weakest = [...you.table].sort((x, y) => x.hp - y.hp)[0];
      attackCreature(game, attacker, weakest);
    } else {
      attackHero(game, attacker);
    }
    hooks.onAction();
    await sleep(550);
    if (game.phase !== "ai") return;
  }

  await sleep(400);
  if (game.phase === "ai") {
    hooks.onAiDone();
  }
}

function effectiveVs(attacker, defender) {
  const a = cardDef(attacker.defId);
  const d = cardDef(defender.defId);
  return a.atk + (elementBeats(a.element, d.element) ? 2 : 0);
}
