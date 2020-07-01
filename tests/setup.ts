const readline = require('readline');
const fs = require('fs');

export const fetchSpell = async (name) => {
  const rl = readline.createInterface({
    terminal: false,
    input: fs.createReadStream('./static/packs/spells.db'),
  });
  for await (const line of rl) {
    const json = JSON.parse(line);
    if (json.name === name) return json;
  }
  return null;
};

//@ts-ignore
global.game = Object.freeze({
  settings: Object.freeze({
    get: (module, settingKey) => {
      switch (settingKey)
      {
        /* Proficiency Modifiers */
        case 'proficiencyUntrainedModifier': return 0;
        case 'proficiencyTrainedModifier':   return 2;
        case 'proficiencyExpertModifier':    return 4;
        case 'proficiencyMasterModifier':    return 6;
        case 'proficiencyLegendaryModifier': return 8;

        /* Variant rules */
        case 'proficiencyVariant':           return 'ProficiencyWithLevel';
        default: throw new Error("Undefined setting.");
      }
    },
  }),
});
