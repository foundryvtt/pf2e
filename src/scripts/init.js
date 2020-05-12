/**
 * Activate certain behaviors on FVTT ready hook
 */
 Hooks.once('init', () => {
   game.pf2e = {
     rollItemMacro,
   };
 });

/**
 * Activate certain behaviors on Canvas Initialization hook (thanks for MooMan for this snippet)
 */
Hooks.on('canvasInit', async () => {
  /**
   * Double every other diagonal movement
   */
  SquareGrid.prototype.measureDistance = function (p0, p1) {
    const gs = canvas.dimensions.size;
    const ray = new Ray(p0, p1);
    const nx = Math.abs(Math.ceil(ray.dx / gs));
    const ny = Math.abs(Math.ceil(ray.dy / gs));

    // Get the number of straight and diagonal moves
    const nDiagonal = Math.min(nx, ny);
    const nStraight = Math.abs(ny - nx);

    const nd10 = Math.floor(nDiagonal / 2);
    const spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
    return spaces * canvas.dimensions.distance;
  };
});


/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

Hooks.on('hotbarDrop', (bar, data, slot) => {
  if (data.type !== 'Item') return;
  createItemMacro(data.data, slot);
  return false;
});

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} item     The item data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(item, slot) {
  const command = `game.pf2e.rollItemMacro("${item._id}");`;
  let macro = game.macros.entities.find((m) => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command,
      flags: { 'pf2e.itemMacro': true },
    }, { displaySheet: false });
  }
  game.user.assignHotbarMacro(macro, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemId) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find((i) => i._id === itemId) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item with ID ${itemId}`);

  // Trigger the item roll
  return item.roll();
}
