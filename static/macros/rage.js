const RAGE_DAMAGE = 2; // increase for giant instinct or higher levels

(async () => {
    if (actor) {
    for (let token of canvas.tokens.controlled) {
      if (
        (token.actor.data.data.customModifiers["ac"] || []).some(
          (modifier) => modifier.name === "Rage"
        )
      ) {
        await actor.removeCustomModifier("ac", "Rage");
        await actor.removeCustomModifier("damage", "Rage");
        /// Remove the line below if you do not wish for your character to lose all temp hp when toggled "off".
        await actor.update({ "data.attributes.hp.temp": 0 });
        /// Remove the line above if you do not wish for your character to lose all temp hp when toggled "off".
        if (
          token.data.effects.includes(
            "systems/pf2e/icons/features/classes/rage.jpg"
          )
        ) {
          token.toggleEffect("systems/pf2e/icons/features/classes/rage.jpg");
        }
      } else {
        const tmpHP =
          token.actor.data.data.details.level.value +
          token.actor.data.data.abilities.con.mod;
        if (token.actor.data.data.attributes.hp.temp < tmpHP) {
          await actor.update({ "data.attributes.hp.temp": tmpHP });
        }
        await actor.addCustomModifier("ac", "Rage", -1, "untyped");
        await actor.addCustomModifier("damage", "Rage", RAGE_DAMAGE, "status");
        if (
          !token.data.effects.includes(
            "systems/pf2e/icons/features/classes/rage.jpg"
          )
        ) {
          token.toggleEffect("systems/pf2e/icons/features/classes/rage.jpg");
        }
      }
    }
  } else {
    ui.notifications.warn("You must have an actor selected.");
  }
})();
