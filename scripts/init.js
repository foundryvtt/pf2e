
/**
 * Activate certain behaviors on FVTT ready hook
 */
Hooks.once("init", () => {
  
  // Pre-load templates
  loadTemplates([

    // Actor Sheet Partials (Tabs)
    "public/systems/pf2e/templates/actors/tabs/actor-actions.html",
    "public/systems/pf2e/templates/actors/tabs/actor-biography.html",
    "public/systems/pf2e/templates/actors/tabs/actor-feats.html",
    "public/systems/pf2e/templates/actors/tabs/actor-inventory.html",
    "public/systems/pf2e/templates/actors/tabs/actor-skills.html",
    "public/systems/pf2e/templates/actors/tabs/actor-spellbook.html",
    "public/systems/pf2e/templates/actors/tabs/actor-spellbook-prepared.html",
    "public/systems/pf2e/templates/actors/tabs/actor-spellbook-spontaneous.html",

    // Actor Sheet Partials (Legacy)
    "public/systems/pf2e/templates/actors/actor-attributes.html",
    "public/systems/pf2e/templates/actors/actor-abilities.html",    
    "public/systems/pf2e/templates/actors/actor-traits.html",
    "public/systems/pf2e/templates/actors/actor-classes.html",

    // Item Sheet Partials
    "public/systems/pf2e/templates/items/action-details.html",
    "public/systems/pf2e/templates/items/action-sidebar.html",
    "public/systems/pf2e/templates/items/armor-details.html",
    "public/systems/pf2e/templates/items/armor-sidebar.html",
    "public/systems/pf2e/templates/items/backpack-sidebar.html",
    "public/systems/pf2e/templates/items/class-sidebar.html",
    "public/systems/pf2e/templates/items/consumable-details.html",
    "public/systems/pf2e/templates/items/consumable-sidebar.html",
    "public/systems/pf2e/templates/items/equipment-details.html",
    "public/systems/pf2e/templates/items/equipment-sidebar.html",
    "public/systems/pf2e/templates/items/feat-details.html",
    "public/systems/pf2e/templates/items/feat-sidebar.html",
    "public/systems/pf2e/templates/items/lore-sidebar.html",
    "public/systems/pf2e/templates/items/spell-details.html",
    "public/systems/pf2e/templates/items/spell-sidebar.html",
    "public/systems/pf2e/templates/items/tool-sidebar.html",
    "public/systems/pf2e/templates/items/melee-details.html",
    "public/systems/pf2e/templates/items/weapon-details.html",
    "public/systems/pf2e/templates/items/weapon-sidebar.html"
  ]);

  /* -------------------------------------------- */

  /**
   * Override the default Initiative formula to customize special behaviors of the D&D5e system.
   * Apply advantage, proficiency, or bonuses where appropriate
   * Apply the dexterity score as a decimal tiebreaker if requested
   * See Combat._getInitiativeFormula for more detail.
   * @private
   */
  Combat.prototype._getInitiativeFormula = function(combatant) {
    const actor = combatant.actor;
    if ( !actor ) return "1d20";
    const data = actor ? actor.data.data : {},
          parts = ["1d20", data.attributes.perception.value];

/*     // Advantage on Initiative
    if ( actor.getFlag("dnd5e", "initiativeAdv") ) parts[0] = "2d20kh";

    // Half-Proficiency to Initiative
    if ( actor.getFlag("dnd5e", "initiativeHalfProf") ) {
      parts.push(Math.floor(0.5 * data.attributes.prof.value))
    }

    // Alert Bonus to Initiative
    if ( actor.getFlag("dnd5e", "initiativeAlert") ) parts.push(5);

    // Dexterity tiebreaker
    if ( CONFIG.initiative.tiebreaker ) parts.push(data.abilities.dex.value / 100); */
    return parts.join("+");
  }
});

/**
 * Activate certain behaviors on Canvas Initialization hook (thanks for MooMan for this snippet)
 */
Hooks.on("canvasInit", async () => {

  /**
   * Double every other diagonal movement
   */
  SquareGrid.prototype.measureDistance = function(p0, p1) {
    let gs = canvas.dimensions.size,
        ray = new Ray(p0, p1),
        nx = Math.abs(Math.ceil(ray.dx / gs)),
        ny = Math.abs(Math.ceil(ray.dy / gs));

    // Get the number of straight and diagonal moves
    let nDiagonal = Math.min(nx, ny),
        nStraight = Math.abs(ny - nx);

    let nd10 = Math.floor(nDiagonal / 2);
    let spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
    return spaces * canvas.dimensions.distance;  

  }
});