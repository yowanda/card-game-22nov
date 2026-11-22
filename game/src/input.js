// input.js — mouse targeting and keyboard play for the duel.
// Clicking resolves in two steps where a target is needed: select the card or
// attacker first, then click its target. Spells and creatures that need no
// target resolve on the first click.
import { cardDef } from "./cards.js";
import { canPlayCard, playCard, attackCreature, attackHero } from "./state.js";
import { sfx } from "./sound.js";

export function handleHandCard(game, card, refresh) {
  if (game.phase !== "player") return;
  const def = cardDef(card.defId);
  if (!canPlayCard(game, game.you, card)) {
    game.message = def.kind === "creature" && game.you.table.length >= 5
      ? "Your table is full — no room for another creature!"
      : `Not enough mana — ${def.name} costs ${def.cost}.`;
    refresh();
    return;
  }
  if (def.kind === "creature") {
    playCard(game, game.you, card.uid, null);
    game.selectedHand = null;
    game.selectedAttacker = null;
    sfx.play();
    refresh();
    return;
  }
  if (def.target === "none" || def.target === "hero") {
    playCard(game, game.you, card.uid, game.you);
    game.selectedHand = null;
    sfx.play();
    refresh();
    return;
  }
  // Surge Bolt: needs a target — select it and wait for a click.
  game.selectedHand = game.selectedHand === card.uid ? null : card.uid;
  game.selectedAttacker = null;
  game.message = "Surge Bolt ready — click a creature or a hero to strike!";
  sfx.click();
  refresh();
}

export function handleYouCreature(game, creature, refresh) {
  if (game.phase !== "player") return;
  if (game.selectedHand) {
    // Surge Bolt aimed at your own creature.
    const def = cardDef(game.you.hand.find((c) => c.uid === game.selectedHand)?.defId ?? "");
    if (def && def.id === "surge-bolt") {
      playCard(game, game.you, game.selectedHand, creature);
      game.selectedHand = null;
      sfx.hit();
      refresh();
      return;
    }
  }
  if (!creature.canAttack) {
    game.message = `${cardDef(creature.defId).name} already attacked, or just arrived — it strikes next turn.`;
    refresh();
    return;
  }
  game.selectedAttacker = game.selectedAttacker === creature.uid ? null : creature.uid;
  game.selectedHand = null;
  game.message = game.selectedAttacker
    ? `${cardDef(creature.defId).name} is ready — click an enemy creature or Kess to attack!`
    : "Attack cancelled.";
  sfx.click();
  refresh();
}

export function handleFoeCreature(game, creature, refresh) {
  if (game.phase !== "player") return;
  if (game.selectedHand) {
    const def = cardDef(game.you.hand.find((c) => c.uid === game.selectedHand)?.defId ?? "");
    if (def && def.id === "surge-bolt") {
      playCard(game, game.you, game.selectedHand, creature);
      game.selectedHand = null;
      sfx.hit();
      refresh();
      return;
    }
  }
  if (game.selectedAttacker) {
    const attacker = game.you.table.find((c) => c.uid === game.selectedAttacker);
    if (attacker && attackCreature(game, attacker, creature)) {
      game.selectedAttacker = null;
      sfx.hit();
      refresh();
    }
    return;
  }
  game.message = "Select one of your creatures first, then click an enemy to attack it.";
  refresh();
}

export function handleHero(game, who, refresh) {
  if (game.phase !== "player") return;
  const side = who === "you" ? game.you : game.foe;
  if (game.selectedHand) {
    const def = cardDef(game.you.hand.find((c) => c.uid === game.selectedHand)?.defId ?? "");
    if (def && def.id === "surge-bolt") {
      playCard(game, game.you, game.selectedHand, side);
      game.selectedHand = null;
      sfx.hit();
      refresh();
      return;
    }
    if (def && def.target === "hero") {
      playCard(game, game.you, game.selectedHand, side);
      game.selectedHand = null;
      sfx.play();
      refresh();
      return;
    }
  }
  if (who === "foe" && game.selectedAttacker) {
    const attacker = game.you.table.find((c) => c.uid === game.selectedAttacker);
    if (attacker && attackHero(game, attacker)) {
      game.selectedAttacker = null;
      sfx.hit();
      refresh();
    }
    return;
  }
  if (who === "you" && game.selectedAttacker) {
    game.message = "Your creatures cannot strike you — aim at Kess or her creatures!";
    refresh();
    return;
  }
  refresh();
}

export function attachKeyboard(getGame, actions) {
  document.addEventListener("keydown", (e) => {
    const game = getGame();
    if (!game || game.screen !== "game") {
      if ((e.key === "Enter" || e.key === " ") && game && game.screen !== "game") {
        e.preventDefault();
        actions.onPrimary();
      }
      return;
    }
    if (e.key === "Escape") {
      game.selectedHand = null;
      game.selectedAttacker = null;
      game.message = "Selection cancelled.";
      actions.refresh();
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && game.phase === "player") {
      e.preventDefault();
      actions.onEndTurn();
      return;
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 7 && game.phase === "player") {
      const card = game.you.hand[n - 1];
      if (card) handleHandCard(game, card, actions.refresh);
    }
  });
}
