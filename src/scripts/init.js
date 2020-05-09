(async () => {
  async function isCanvasReady() {
    return new Promise((resolve) => {
      Hooks.once('canvasReady', resolve);
    });
  }

  class PF2eActorSchema {

    static async updataActor(actor, systemSchemaVersion, worldSchemaVersion) {
      const actorData = actor.data;
      const deltaData = {};

      const { isGM } = game.user;

      if (!isGM) return;

      let updated = false;
      // Update the dying, doomed and wounded attributes from a number to an object (with data that is configured in the template.json)
      if (worldSchemaVersion < 0.412 && actorData.type === 'character') {
        console.log(`PF2e System | Preparing to update ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);
                
        deltaData['data.attributes.dying'] = {};
        deltaData['data.attributes.dying.value'] = 0;
        deltaData['data.attributes.dying.max'] = 4;
      
        deltaData['data.attributes.wounded'] = {};
        deltaData['data.attributes.wounded.value'] = 0;
        deltaData['data.attributes.wounded.max'] = 3;
      
        deltaData['data.attributes.doomed'] = {};
        deltaData['data.attributes.doomed.value'] = 0;
        deltaData['data.attributes.doomed.max'] = 3;
        
        deltaData['data.schema.version.value'] = systemSchemaVersion;
        
        await actor.update(deltaData);
        console.log(`PF2e System | Successfully updated ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);
        updated = true;
      } 
      
      if (worldSchemaVersion < 0.544) {
        console.log(`PF2e System | Preparing to update ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);
        
        deltaData['data.attributes.sp'] = {}; 
        deltaData['data.attributes.sp.min'] = 0; 
        deltaData['data.attributes.sp.max'] = 0; 
        deltaData['data.attributes.sp.value'] = 0; 

        deltaData['data.attributes.resolve'] = {}; 
        deltaData['data.attributes.resolve.value'] = 0; 

        deltaData['data.details.keyability'] = {};
        deltaData['data.details.keyability.value'] = "str";

        await actor.update(deltaData);
        updated = true;
      } 

      if (worldSchemaVersion < 0.559) {

        if (actor.data.type === 'npc') {
          console.log(`PF2e System | Preparing to update ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);

          let updatedItems = [];
          const items = duplicate(actor.data.items);

          items.forEach(item => {
              if (item.type === 'melee' && item.data.damage.die) {
                let damageRolls = {
                  'migrated': {
                    damage: item.data.damage.die,
                    damageType: item.data.damage.damageType
                  }
                };
                let updatedItem = {
                  _id: item._id
                }
                updatedItem['data.damageRolls'] = damageRolls;
                updatedItems.push(updatedItem);
              }              
          });

          console.log('updatedItems: ', updatedItems);
          await actor.updateManyEmbeddedEntities('OwnedItem', updatedItems);
        }
        
        

        updated = true;
      }

      if (worldSchemaVersion < 0.561) {
        if (actor.data.type === 'character') {
          console.log(`PF2e System | Updating ${actorData.name} (${actorData._id}) schema to version ${systemSchemaVersion}`);

          deltaData['data.attributes.flatbonushp'] = parseInt((actorData.data.attributes.flatbonushp || {}).value) || 0; 
          deltaData['data.attributes.levelbonushp'] = parseInt((actorData.data.attributes.levelbonushp || {}).value) || 0; 
          deltaData['data.attributes.flatbonussp'] = parseInt((actorData.data.attributes.flatbonussp || {}).value) || 0;
          deltaData['data.attributes.levelbonussp'] = parseInt((actorData.data.attributes.levelbonussp || {}).value) || 0;
          deltaData['data.attributes.ancestryhp'] = parseInt((actorData.data.attributes.ancestryhp || {}).value) || 0;
          deltaData['data.attributes.classhp'] = parseInt((actorData.data.attributes.classhp || {}).value) || 0;

          await actor.update(deltaData);

          updated = true;
        }
      }

      if (worldSchemaVersion < 0.566) {

        if (actor.data.type === 'npc') {
          console.log(`PF2e System | Preparing to update ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);

          let updatedItems = [];
          const items = duplicate(actor.data.items);

          items.forEach(item => {
              if (item.type === 'melee' && item.data.attackEffects) {
                let attackEffects = {
                  'value': item.data.attackEffects
                };
                let updatedItem = {
                  _id: item._id
                }
                updatedItem['data.attackEffects'] = attackEffects;
                updatedItems.push(updatedItem);
              }              
          });

          console.log('updatedItems: ', updatedItems);
          await actor.updateManyEmbeddedEntities('OwnedItem', updatedItems);
        }
        
        

        updated = true;
      }
      
      if (worldSchemaVersion < 0.567) { 
        if (actor.data.type === 'character') {
          console.log(`PF2e System | Preparing to update ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);
          deltaData['data.attributes.bonusbulk'] = 0;
          let classDC = {
            "rank": 0,
            "ability": "str",
            "item": 0,
            "value": 0,
            "breakdown": ""
          }
          deltaData['data.attributes.classDC'] = classDC;
          await actor.update(deltaData);
          console.log(`PF2e System | Successfully updated ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);
          updated = true;
        }
      }

      if (worldSchemaVersion < 0.569 && actorData.type === 'npc') {
        console.log(`PF2e System | Preparing to update language values of ${actorData._id} (${actorData.name}) to version ${systemSchemaVersion}`);        

        deltaData['data.traits.languages.value'] = actorData.data.traits.languages.value.map( (language) => {
          return language.toString().toLowerCase();
        });

        await actor.update(deltaData);
        console.log(`PF2e System | Successfully updated ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);
        updated = true;
      }
      
      if (worldSchemaVersion < 0.571 && actorData.type === 'npc') {
        
          console.log(`PF2e System | Preparing to update language values of ${actorData._id} (${actorData.name}) to version ${systemSchemaVersion}`);        

          deltaData['data.traits.rarity.value'] = 'common';
  
          await actor.update(deltaData);
          console.log(`PF2e System | Successfully updated ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);
          updated = true;
        
      }

      if (!updated) {
        console.log(`PF2e System | Actor ${actorData.name} (${actorData._id}) does not meet migration criteria and is being skipped`);
      }
    }
  }

  await isCanvasReady();

  const { isGM } = game.user;


  if (isGM) {
    const systemSchemaVersion = Number(game.system.data.schema);
    const worldSchemaVersion = Number(game.settings.get('pf2e', 'worldSchemaVersion'));

    if (systemSchemaVersion > worldSchemaVersion) {
      for (const actor of game.actors.entities) {
        PF2eActorSchema.updataActor(actor, systemSchemaVersion, worldSchemaVersion);
      }
      game.settings.set('pf2e', 'worldSchemaVersion', systemSchemaVersion);
    } else {
      console.log('PF2e System | World Schema matches System Schema. No migration required');
    }
  }
})();

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
