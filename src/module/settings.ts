import { compendiumBrowser } from './packs/compendium-browser';

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
    hint: 'When enabled, a backpack and belt pouch with each 999 coins will add up to 0 bulk. ' +
        'When disabled, the above example will combine all stacks from all containers together and ' +
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
      1: "Use Stamina" // I plan to expand this, hence the dropdown.
    }
  });
  game.settings.register('pf2e', 'proficiencyVariant', {
    name: 'Proficiency without Level Variant Rules',
    hint: "Play with the proficiency without level variant from Gamemastery Guide pg 198.",
    scope: 'world',
    config: true,
    default: 'ProficiencyWithLevel',
    type: String,
    choices: {
      ProficiencyWithLevel: "Use Default rules",
      ProficiencyWithoutLevel: "Use Variant rules"
    }
  });
  game.settings.register('pf2e', 'proficiencyUntrainedModifier', {
    name: 'Untrained proficiency modifier',
    hint: "Adjust to your liking to compliment the proficiency without level variant rules, recommended with variant rules is -2. Requires recalculation by reload or modifying a value per actor.",
    scope: 'world',
    config: true,
    default: 0,
    type: Number
  });
  game.settings.register('pf2e', 'proficiencyTrainedModifier', {
    name: 'Trained proficiency modifier',
    hint: "Adjust to your liking to compliment the proficiency without level variant rules. Requires recalculation by reload or modifying a value per actor.",
    scope: 'world',
    config: true,
    default: 2,
    type: Number
  });
  game.settings.register('pf2e', 'proficiencyExpertModifier', {
    name: 'Expert proficiency modifier',
    hint: "Adjust to your liking to compliment the proficiency without level variant rules. Requires recalculation by reload or modifying a value per actor.",
    scope: 'world',
    config: true,
    default: 4,
    type: Number
  });
  game.settings.register('pf2e', 'proficiencyMasterModifier', {
    name: 'Master proficiency modifier',
    hint: "Adjust to your liking to compliment the proficiency without level variant rules. Requires recalculation by reload or modifying a value per actor.",
    scope: 'world',
    config: true,
    default: 6,
    type: Number
  });
  game.settings.register('pf2e', 'proficiencyLegendaryModifier', {
    name: 'Legendary proficiency modifier',
    hint: "Adjust to your liking to compliment the proficiency without level variant rules. Requires recalculation by reload or modifying a value per actor.",
    scope: 'world',
    config: true,
    default: 8,
    type: Number
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
  game.settings.register('pf2e', 'compendiumBrowserPacks', {
    name: 'Compendium Browser Packs',
    hint: 'Settings to exclude packs from loading',
    default: '{}',
    type: String,
    scope: 'world',
    onChange: (settings) => {
      compendiumBrowser.loadSettings();
    },
  });
}
