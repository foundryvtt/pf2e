export default function () {
  game.settings.register('pf2e', 'worldSchemaVersion', {
    name: 'Actor Schema Version',
    hint: "Records the schema version for PF2e system actor data. (don't modify this unless you know what you are doing)",
    scope: 'world',
    config: true,
    default: 0,
    type: Number,
  });
  game.settings.register('pf2e', 'defaultTokenSettings', {
    name: 'Default Prototype Token Settings',
    hint: "Automatically set advised prototype token settings to newly created Actors.",
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
  });
  game.settings.register('pf2e', 'ignoreCoinBulk', {
    name: 'Coins are weightless',
    hint: "Toggle on to ignore currency weight.",
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  });
  game.settings.register('pf2e', 'staminaVariant', {
    name: 'Stamina Variant Rules',
    hint: "Play with the stamina variant from Gamemastery Guide pg 200",
    scope: 'world',
    config: true,
    default: 0,
    type: Number,
    choices: {
      0: "Do not use Stamina",
      1: "Use Stamina" //I plan to expand this, hence the dropdown.
    }
  });
}
