const readline = require('readline');
const fs = require('fs');

global.fetchSpell = async (name) => {
  const rl = readline.createInterface({
    terminal: false,
    input: fs.createReadStream('./dist/packs/spells.db'),
  });
  for await (const line of rl) {
    const json = JSON.parse(line);
    if (json.name === name) return json;
  }
  return null;
};

global.game = Object.freeze({
  settings: Object.freeze({
    get: (module, settingKey) => {
      switch (settingKey)
      {
        /* Proficiency Modifiers */
        case 'proficiencyUntrainedModifer': return 0;
        case 'proficiencyTrainedModifer':   return 2;
        case 'proficiencyExpertModifer':    return 4;
        case 'proficiencyMasterModifer':    return 6;
        case 'proficiencyLegendaryModifer': return 8;

        /* Variant rules */
        case 'proficiencyVariant':          return 'ProficiencyWithLevel';
        default: throw new Error("Undefined setting.");
      }
    },
  }),
});
