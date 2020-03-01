export default function () {
  game.settings.register('pf2e', 'worldSchemaVersion', {
    name: 'Actor Schema Version',
    hint: "Records the schema version for PF2e system actor data. (don't modify this unless you know what you are doing)",
    scope: 'world',
    config: true,
    default: 0,
    type: Number,
  });
}
