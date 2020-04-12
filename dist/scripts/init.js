(async () => {
  async function isCanvasReady() {
    return new Promise((resolve) => {
      Hooks.once('canvasReady', resolve);
    });
  }

  class PF2eActorSchema {
    static get worldVersion() {
      return 0.356;
    }

    static get allActorsVersion() {
      const version = [];
      for (const actor of game.actors.entities) {
        version.push({
          name: actor.data.name,
          type: actor.data.type,
          id: actor.data._id,
          schema: actor.data.data.schema.version.value,
        });
      }
      return version;
    }

    static async updataActor(actor, version) {
      const actorData = actor.data;
      const deltaData = {};

      const { isGM } = game.user;

      if (!isGM) return;
      const worldSchemaVersion = Number(game.settings.get('pf2e', 'worldSchemaVersion'));

      // get changes for this version
      if (version === 0.411 && worldSchemaVersion === 0) {
        console.log(`PF2e System | Preparing to update ${actorData._id} (${actorData.name}) schema to version ${version}`);
        /*
        *
        * Add Spellcasting Entry Item
        *
        */
        let magicTradition = actorData.data.attributes.tradition.value;
        let spellcastingType = actorData.data.attributes.prepared.value;
        const proficiency = actorData.data.attributes.spelldc.rank;
        const { item } = actorData.data.attributes.spelldc;
        const ability = actorData.data.attributes.spellcasting.value;
        let name = `${CONFIG.preparationType[spellcastingType]} ${CONFIG.magicTraditions[magicTradition]} Spells`;

        if (typeof magicTradition === 'undefined' || magicTradition === '') {
          if (actorData.type === 'character') {
            name = 'Class DC';
            magicTradition = 'focus';
          } else {
            name = 'Spells';
          }
        }

        if (typeof spellcastingType === 'undefined' || spellcastingType === '') {
          spellcastingType = 'innate';
        }

        // Define new spellcasting entry
        const spellcastingEntity = {
          ability: {
            type: 'String',
            label: 'Spellcasting Ability',
            value: ability,
          },
          item: {
            type: 'Number',
            label: 'Item Bonus',
            value: item,
          },
          tradition: {
            type: 'String',
            label: 'Magic Tradition',
            value: magicTradition,
          },
          prepared: {
            type: 'String',
            label: 'Spellcasting Type',
            value: spellcastingType,
          },
          proficiency: {
            type: 'Number',
            label: 'Proficiency Level',
            value: proficiency,
          },
          slots: {
            slot0: {
              type: 'Number',
              label: 'Cantrip',
              prepared: actorData.data.spells.spell0.prepared ? actorData.data.spells.spell0.prepared : [],
              max: actorData.data.spells.spell0.max ? actorData.data.spells.spell0.max : '0',
            },
            slot1: {
              type: 'Number',
              label: '1st Level',
              prepared: actorData.data.spells.spell1.prepared ? actorData.data.spells.spell1.prepared : [],
              max: actorData.data.spells.spell1.max ? actorData.data.spells.spell1.max : '0',
              value: actorData.data.spells.spell1.value ? actorData.data.spells.spell1.value : '0',
            },
            slot2: {
              type: 'Number',
              label: '2nd Level',
              prepared: actorData.data.spells.spell2.prepared ? actorData.data.spells.spell2.prepared : [],
              max: actorData.data.spells.spell2.max ? actorData.data.spells.spell2.max : '0',
              value: actorData.data.spells.spell2.value ? actorData.data.spells.spell2.value : '0',
            },
            slot3: {
              type: 'Number',
              label: '3rd Level',
              prepared: actorData.data.spells.spell3.prepared ? actorData.data.spells.spell3.prepared : [],
              max: actorData.data.spells.spell3.max ? actorData.data.spells.spell3.max : '0',
              value: actorData.data.spells.spell3.value ? actorData.data.spells.spell3.value : '0',
            },
            slot4: {
              type: 'Number',
              label: '4th Level',
              prepared: actorData.data.spells.spell4.prepared ? actorData.data.spells.spell4.prepared : [],
              max: actorData.data.spells.spell4.max ? actorData.data.spells.spell4.max : '0',
              value: actorData.data.spells.spell4.value ? actorData.data.spells.spell4.value : '0',
            },
            slot5: {
              type: 'Number',
              label: '5th Level',
              prepared: actorData.data.spells.spell5.prepared ? actorData.data.spells.spell5.prepared : [],
              max: actorData.data.spells.spell5.max ? actorData.data.spells.spell5.max : '0',
              value: actorData.data.spells.spell5.value ? actorData.data.spells.spell5.value : '0',
            },
            slot6: {
              type: 'Number',
              label: '6th Level',
              prepared: actorData.data.spells.spell6.prepared ? actorData.data.spells.spell6.prepared : [],
              max: actorData.data.spells.spell6.max ? actorData.data.spells.spell6.max : '0',
              value: actorData.data.spells.spell6.value ? actorData.data.spells.spell6.value : '0',
            },
            slot7: {
              type: 'Number',
              label: '7th Level',
              prepared: actorData.data.spells.spell7.prepared ? actorData.data.spells.spell7.prepared : [],
              max: actorData.data.spells.spell7.max ? actorData.data.spells.spell7.max : '0',
              value: actorData.data.spells.spell7.value ? actorData.data.spells.spell7.value : '0',
            },
            slot8: {
              type: 'Number',
              label: '8th Level',
              prepared: actorData.data.spells.spell8.prepared ? actorData.data.spells.spell8.prepared : [],
              max: actorData.data.spells.spell8.max ? actorData.data.spells.spell8.max : '0',
              value: actorData.data.spells.spell8.value ? actorData.data.spells.spell8.value : '0',
            },
            slot9: {
              type: 'Number',
              label: '9th Level',
              prepared: actorData.data.spells.spell9.prepared ? actorData.data.spells.spell9.prepared : [],
              max: actorData.data.spells.spell9.max ? actorData.data.spells.spell9.max : '0',
              value: actorData.data.spells.spell9.value ? actorData.data.spells.spell9.value : '0',
            },
            slot10: {
              type: 'Number',
              label: '10th Level',
              prepared: actorData.data.spells.spell10.prepared ? actorData.data.spells.spell10.prepared : [],
              max: actorData.data.spells.spell10.max ? actorData.data.spells.spell10.max : '0',
              value: actorData.data.spells.spell10.value ? actorData.data.spells.spell10.value : '0',
            },
            slot11: {
              type: 'Number',
              label: 'Focus',
              prepared: actorData.data.spells.spell11.prepared ? actorData.data.spells.spell11.prepared : [],
              max: actorData.data.spells.spell11.max ? actorData.data.spells.spell11.max : '0',
              value: actorData.data.spells.spell11.value ? actorData.data.spells.spell11.value : '0',
            },
          },
        };

        const itemData = {
          name,
          type: 'spellcastingEntry',
          data: spellcastingEntity,
        };

        /*
        * Update Nature to use Wisdom
        */
        if (actorData.data.skills.nat.ability === 'int') {
          const key = 'data.skills.nat.ability';
          deltaData[key] = 'wis';
        }

        /*
        * Update Actors schema version
        */
        deltaData['data.schema.version.value'] = version;

        // this.actor.update({"data.attributes.hp.value": hp, "data.attributes.hp.max": hp});

        // apply changes to actor
        console.log(`PF2e System | Adding Spellcasting Entry to ${actorData._id} (${actorData.name})`);
        await actor.createOwnedItem(itemData, { renderSheet: false }).then(async (spellcastingEntry) => {
          console.log('PF2e System | Spellcasting Entry Item Location:', spellcastingEntry.data.id);
          const location = spellcastingEntry.data.id;
          for (const i of actorData.items) {
            if (i.type === 'spell') {
              console.log(`PF2e System | Updating ${actorData._id} (${actorData.name}): Item ${i.name}`);
              i.data.location.value = location;
              await actor.updateOwnedItem(i, true);
            }
          }
        });

        await actor.update(deltaData);
        console.log(`PF2e System | Successfully updated ${actorData._id} (${actorData.name}) schema to version ${version}`);
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
        PF2eActorSchema.updataActor(actor, systemSchemaVersion);
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
     convertPackToBase64Embedded,
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

class ConvertDialog extends Dialog {

  activateListeners(html) {
    super.activateListeners(html);
    
    html.find('.pack-img-convert').click(async (ev) => {
      const canvas = document.getElementById('image-canvas');
      const packname = $(ev.currentTarget).attr('pack-name');
      const ctx = canvas.getContext('2d');
      const maxW = 64;
      const maxH = 64;
  
      function handleFiles(imgURL, callback) {
        const img = new Image();
        img.onload = function () {
          const iw = img.width;
          const ih = img.height;
          const scale = Math.min((maxW / iw), (maxH / ih));
          const iwScaled = iw * scale;
          const ihScaled = ih * scale;
          canvas.width = iwScaled;
          canvas.height = ihScaled;
          ctx.drawImage(img, 0, 0, iwScaled, ihScaled);
          callback(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.src = imgURL;
      }
  
      const pack = game.packs.find((p) => p.collection === packname);

      if (!pack) {
        console.error(`Pack ${packname} not found.`);
        return
      }
  
      await pack.getContent().then(async (content) => {
        for (const item of content) {
          const imageUrl = item.data.img;
  
          if (imageUrl != 'icons/mystery-man.png' /* && !imageUrl.startsWith('data:image') */) {
            handleFiles(imageUrl, async (base64Url) => {
              console.log('item: ', item._id);
              item.data.img = base64Url;
              await pack.importEntity(item);
              await pack.deleteEntity(item._id);
            });
          }
        }
      });
    });
  }
}
    
async function convertPackToBase64Embedded (packname="world.bestiary-test") {
  // This is the HTML to add to the pack-img-convert application.
  // <canvas id="canvas" width=64 height=64></canvas>  

  // Render confirmation modal dialog  
  renderTemplate('systems/pf2e/templates/packs/convert-images.html', {packname: packname}).then((html) => {
    new ConvertDialog({
      title: 'Convert Pack Images',
      content: html,
      buttons: {
        Close: {
          icon: '<i class="fa fa-check"></i>',
          label: 'Close'              
        },        
      },
      default: 'Close',
    }).render(true);
  }); 
}
