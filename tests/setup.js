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
