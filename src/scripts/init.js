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

      if (worldSchemaVersion < 0.545) {
        console.log(`PF2e System | Preparing to update ${actorData._id} (${actorData.name}) schema to version ${systemSchemaVersion}`);
        
        deltaData['data.attributes.flatbonushp'] = 0; 
        deltaData['data.attributes.levelbonushp'] = 0; 
        deltaData['data.attributes.flatbonussp'] = 0; 
        deltaData['data.attributes.levelbonussp'] = 0; 
        deltaData['data.attributes.ancestryhp'] = 0; 
        deltaData['data.attributes.classhp'] = 0; 
      }

      if (!updated) {
        console.log(`PF2e System | Actor ${actorData._id} (${actorData.name}) does not meet migration criteria and is being skipped`);
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
