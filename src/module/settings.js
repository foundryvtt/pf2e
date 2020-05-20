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
    default: false,
    type: Boolean
  });
  game.settings.register('pf2e', 'ignoreContainerOverflow', {
    name: 'Do not combine stacks from different containers when calculating bulk',
    hint: 'When toggled, a backpack and belt pouch with each 999 coins will add up to 0 bulk. ' +
        'When toggled, the above example will combine all stacks from all containers together and ' +
        'add up to 1 bulk.',
    scope: 'world',
    config: true,
    default: false,
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
  game.settings.register('pf2e', 'critRule', {
    name: 'Critical Damage Rule',
    hint: "Use a different rule for doubling damage on a critical hit",
    scope: 'world',
    config: true,
    default: 'doubledamage',
    type: String,
    choices: {
      doubledamage: "Double the damage",
      doubledice: "Double the number of dice"
    }
  });
}
