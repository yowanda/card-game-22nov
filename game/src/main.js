// main.js — bootstrap for Tidecaller Duel: screens, turn flow, AI turns,
// screenshot states (?shot=title|table|win|loss render the real game at a
// preset moment) and a small window.TIDE handle used by automated smoke tests.
import { createGame, startPlayerTurn, endPlayerTurn, checkEnd } from "./state.js";
import { makeCardInstance, newCreature } from "./cards.js";
import { renderTitle, renderTable, renderEnd } from "./render.js";
import { handleHandCard, handleYouCreature, handleFoeCreature, handleHero, attachKeyboard } from "./input.js";
import { runAiTurn } from "./ai.js";
import { sfx, setMuted, isMuted } from "./sound.js";

const root = document.getElementById("app");
let game = null;
let wins = 0;
let losses = 0;
let muted = false;

function refresh() {
  if (!game) return;
  if (game.screen === "title") {
    renderTitle(root, startGame, wins, losses);
  } else if (game.screen === "game") {
    renderTable(root, game, handlers);
  } else {
    if (game.screen === "win") sfx.win();
    if (game.screen === "loss") sfx.lose();
    renderEnd(root, game, startGame, showTitle);
  }
}

const handlers = {
  onHandCard: (card) => handleHandCard(game, card, refresh),
  onYouCreature: (c) => handleYouCreature(game, c, refresh),
  onFoeCreature: (c) => handleFoeCreature(game, c, refresh),
  onHero: (who) => handleHero(game, who, refresh),
  onEndTurn: () => {
    if (!game || game.phase !== "player") return;
    sfx.turn();
    endPlayerTurn(game);
    refresh();
    runAiTurn(game, {
      onAction: () => refresh(),
      onAiDone: () => {
        if (game.phase === "over") {
          refresh();
          return;
        }
        startPlayerTurn(game);
        sfx.turn();
        refresh();
      },
    });
  },
  onNewGame: () => startGame(),
  onToggleSound: () => {
    muted = !muted;
    setMuted(muted);
    refresh();
  },
  get muted() {
    return muted;
  },
};

function showTitle() {
  if (game) game.screen = "title";
  else game = { screen: "title" };
  renderTitle(root, startGame, wins, losses);
}

function startGame() {
  if (game) {
    wins = game.wins;
    losses = game.losses;
  }
  game = createGame((Date.now() % 2147483647) + 1);
  game.wins = wins;
  game.losses = losses;
  game.screen = "game";
  refresh();
  sfx.deal();
}

// Preset states for screenshots: the real renderer, a staged moment.
function shotState(kind) {
  if (kind === "title") {
    game = { screen: "title" };
    renderTitle(root, startGame, 2, 1);
    return;
  }
  game = createGame(20261122);
  game.wins = 2;
  game.losses = 1;
  if (kind === "table") {
    game.turn = 6;
    game.you.maxMana = 7;
    game.you.mana = 5;
    game.you.life = 24;
    game.foe.life = 19;
    game.you.hand = ["ember-pup", "cinder-fox", "surge-bolt", "tide-mend", "granite-bear", "gale-draw"].map((id) => makeCardInstance(id));
    game.foe.hand = [makeCardInstance("reef-serpent"), makeCardInstance("bramble-wolf"), makeCardInstance("thorn-sprout")];
    game.you.table = [newCreature("reef-serpent", "you"), newCreature("cinder-fox", "you"), newCreature("thorn-sprout", "you")];
    game.foe.table = [newCreature("granite-bear", "foe"), newCreature("storm-heron", "foe")];
    for (const c of game.you.table) c.canAttack = true;
    for (const c of game.foe.table) c.canAttack = false;
    game.message = "Turn 6 — your Cinder Fox has the advantage over Kess's Granite Bear…";
    game.log = [
      "Kess summons Granite Bear (4/6).",
      "Your Reef Serpent strikes Storm Heron for 3.",
      "Turn 6: your mana rises to 7.",
      "You summon Cinder Fox (3/2).",
    ];
    game.screen = "game";
    renderTable(root, game, handlers);
    return;
  }
  if (kind === "win") {
    game.foe.life = 0;
    game.you.life = 11;
    game.turn = 9;
    checkEnd(game);
    renderEnd(root, game, startGame, showTitle);
    return;
  }
  if (kind === "loss") {
    game.you.life = 0;
    game.foe.life = 8;
    game.turn = 11;
    checkEnd(game);
    renderEnd(root, game, startGame, showTitle);
  }
}

const params = new URLSearchParams(location.search);
const shot = params.get("shot");
if (shot) {
  shotState(shot);
} else {
  game = { screen: "title" };
  renderTitle(root, startGame, wins, losses);
}

attachKeyboard(
  () => game,
  {
    refresh,
    onEndTurn: handlers.onEndTurn,
    onPrimary: () => {
      if (game.screen === "title") startGame();
      else if (game.screen === "win" || game.screen === "loss") startGame();
    },
  },
);

// Small handle for automated smoke tests (headless play-throughs).
window.TIDE = {
  get game() {
    return game;
  },
  startGame,
  showTitle,
};
