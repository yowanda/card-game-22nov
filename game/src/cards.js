// cards.js — every card in Tidecaller Duel: definitions, elements, deck building.
// Elements form a cycle: Flame beats Leaf, Leaf beats Tide, Tide beats Stone,
// Stone beats Flame. A creature attacking a creature of the element it beats
// gains +2 attack for that strike.
export const ELEMENTS = {
  flame: { name: "Flame", glyph: "▲", color: "#e8542f", dark: "#8f2a12", beats: "leaf" },
  tide: { name: "Tide", glyph: "●", color: "#2f7fe8", dark: "#144a8f", beats: "stone" },
  leaf: { name: "Leaf", glyph: "◆", color: "#3da35d", dark: "#1d5c31", beats: "tide" },
  stone: { name: "Stone", glyph: "■", color: "#c98a2e", dark: "#7a5414", beats: "flame" },
};

export const ELEMENT_ORDER = ["flame", "leaf", "tide", "stone"];

// kind: "creature" | "spell". spell target: "any" | "hero" | "none".
export const CARD_DEFS = [
  { id: "ember-pup", name: "Ember Pup", kind: "creature", element: "flame", cost: 1, atk: 2, hp: 1, art: "🐺", text: "A spark that bites." },
  { id: "tide-sprite", name: "Tide Sprite", kind: "creature", element: "tide", cost: 1, atk: 1, hp: 2, art: "💧", text: "Slips between waves." },
  { id: "thorn-sprout", name: "Thorn Sprout", kind: "creature", element: "leaf", cost: 1, atk: 1, hp: 3, art: "🌱", text: "Small, stubborn, sharp." },
  { id: "pebble-golem", name: "Pebble Golem", kind: "creature", element: "stone", cost: 2, atk: 2, hp: 4, art: "🗿", text: "Patient as a mountain." },
  { id: "cinder-fox", name: "Cinder Fox", kind: "creature", element: "flame", cost: 2, atk: 3, hp: 2, art: "🦊", text: "Leaves embers in its wake." },
  { id: "reef-serpent", name: "Reef Serpent", kind: "creature", element: "tide", cost: 3, atk: 3, hp: 4, art: "🐍", text: "Coils around the reef." },
  { id: "bramble-wolf", name: "Bramble Wolf", kind: "creature", element: "leaf", cost: 3, atk: 4, hp: 3, art: "🐺", text: "Howls through the thorns." },
  { id: "granite-bear", name: "Granite Bear", kind: "creature", element: "stone", cost: 4, atk: 4, hp: 6, art: "🐻", text: "The hill that walks." },
  { id: "phoenix-chick", name: "Phoenix Chick", kind: "creature", element: "flame", cost: 4, atk: 5, hp: 3, art: "🐦", text: "Born again, angrier." },
  { id: "storm-heron", name: "Storm Heron", kind: "creature", element: "tide", cost: 5, atk: 6, hp: 4, art: "🦢", text: "Rides the lightning rain." },
  { id: "elder-oak", name: "Elder Oak", kind: "creature", element: "leaf", cost: 5, atk: 3, hp: 8, art: "🌳", text: "Older than the duel." },
  { id: "mountain-king", name: "Mountain King", kind: "creature", element: "stone", cost: 6, atk: 7, hp: 7, art: "👑", text: "The table bows to him." },
  { id: "surge-bolt", name: "Surge Bolt", kind: "spell", element: "tide", cost: 2, target: "any", art: "⚡", text: "Deal 3 damage to any target." },
  { id: "tide-mend", name: "Tide Mend", kind: "spell", element: "tide", cost: 2, target: "hero", art: "💚", text: "Restore 6 life to your hero." },
  { id: "gale-draw", name: "Gale Draw", kind: "spell", element: "leaf", cost: 1, target: "none", art: "🌬️", text: "Draw 2 cards." },
  { id: "ember-nova", name: "Ember Nova", kind: "spell", element: "flame", cost: 4, target: "none", art: "💥", text: "Deal 2 damage to all enemy creatures." },
];

export const DECK_LIST = [
  ["ember-pup", 2], ["tide-sprite", 2], ["thorn-sprout", 2], ["pebble-golem", 2],
  ["cinder-fox", 2], ["reef-serpent", 2], ["bramble-wolf", 2], ["granite-bear", 2],
  ["phoenix-chick", 2], ["storm-heron", 2], ["elder-oak", 1], ["mountain-king", 1],
  ["surge-bolt", 2], ["tide-mend", 2], ["gale-draw", 2], ["ember-nova", 1],
]; // 30 cards

export function cardDef(id) {
  return CARD_DEFS.find((c) => c.id === id);
}

export function elementBeats(a, b) {
  return ELEMENTS[a] && ELEMENTS[a].beats === b;
}

export function buildDeck(rng) {
  const ids = [];
  for (const [id, n] of DECK_LIST) for (let i = 0; i < n; i++) ids.push(id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.map((id, i) => ({ uid: `c${i}-${id}`, defId: id }));
}

let uidCounter = 0;
export function makeCardInstance(defId) {
  uidCounter += 1;
  return { uid: `u${uidCounter}-${defId}`, defId };
}

export function newCreature(defId, owner) {
  const def = cardDef(defId);
  return {
    uid: makeCardInstance(defId).uid,
    defId,
    owner,
    atk: def.atk,
    hp: def.hp,
    maxHp: def.hp,
    canAttack: false, // summoning sickness: attacks from next turn
    justPlayed: true,
  };
}
