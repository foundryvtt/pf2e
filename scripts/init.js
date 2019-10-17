(async () => {

  async function isCanvasReady() {
		return new Promise(resolve => {
			Hooks.once('canvasReady', resolve);
		});
	}

  class PF2eActorSchema {
    static get worldVersion() {
      return 0.356;
    }

    static get allActorsVersion() {
      let version = []
      for (let actor of game.actors.entities) {      
        version.push({
          "name": actor.data.name,
          "type": actor.data.type,
          "id": actor.data._id,
          "schema": actor.data.data.schema.version.value,
        })
      }
      return version;
    }

    static async updataActor(actor, version) {
      let actorData = actor.data;
      let deltaData = {};

      const isGM = game.user.isGM;

      if (!isGM) return;

/*       if (actorData.data.schema.version.value === version) {
        console.log(`PF2e System | NOT UPDATING | Actor ${actorData._id} (${actorData.name}) schema matches ${version}`);
        return; // No update needed
      }
      else if (actorData.data.schema.version.value > version) {
        console.log(`PF2e System | NOT UPDATING | Actor ${actorData._id} (${actorData.name}) schema is greater than ${version}`);
        return; // No update needed
      } */

      const worldSchemaVersion = Number(game.settings.get("pf2e", "worldSchemaVersion"));

      

      // get changes for this version
      if (version === 0.411 && worldSchemaVersion === 0) {
        console.log(`PF2e System | Preparing to update ${actorData._id} (${actorData.name}) schema to version ${version}`);
        /* 
        * 
        * Add Spellcasting Entry Item 
        * 
        */
        let magicTradition = actorData.data.attributes.tradition.value,
            spellcastingType = actorData.data.attributes.prepared.value,
            proficiency = actorData.data.attributes.spelldc.rank,
            item = actorData.data.attributes.spelldc.item,
            ability = actorData.data.attributes.spellcasting.value,
            name = `${CONFIG.preparationType[spellcastingType]} ${CONFIG.magicTraditions[magicTradition]} Spells`;

        if (typeof magicTradition === "undefined" || magicTradition === "" ) {
          if (actorData.type === "character") {
            name = "Class DC";
            magicTradition = "focus";
          } else {
            name = "Spells";
          }          
        }

        if (typeof spellcastingType === "undefined" || spellcastingType === "") {
          spellcastingType = "innate";
        }

        // Define new spellcasting entry
        let spellcastingEntity = {
          "ability": {
            "type": "String",
            "label": "Spellcasting Ability",
            "value": ability
          },
          "item": {
            "type": "Number",
            "label": "Item Bonus",
            "value": item
          },
          "tradition": {
            "type": "String",
            "label": "Magic Tradition",
            "value": magicTradition
          },
          "prepared": {
            "type": "String",
            "label": "Spellcasting Type",
            "value": spellcastingType
          },
          "proficiency": {
            "type": "Number",
            "label": "Proficiency Level",
            "value": proficiency
          },
          "slots": {
            "slot0": {
              "type": "Number",
              "label": "Cantrip",
              "prepared": actorData.data.spells.spell0.prepared ? actorData.data.spells.spell0.prepared : [],
              "max": actorData.data.spells.spell0.max ? actorData.data.spells.spell0.max : "0"
            },
            "slot1": {
              "type": "Number",
              "label": "1st Level",
              "prepared": actorData.data.spells.spell1.prepared ? actorData.data.spells.spell1.prepared : [],
              "max": actorData.data.spells.spell1.max ? actorData.data.spells.spell1.max : "0",
              "value": actorData.data.spells.spell1.value ? actorData.data.spells.spell1.value : "0"
            },
            "slot2": {
              "type": "Number",
              "label": "2nd Level",
              "prepared": actorData.data.spells.spell2.prepared ? actorData.data.spells.spell2.prepared : [],
              "max": actorData.data.spells.spell2.max ? actorData.data.spells.spell2.max : "0",
              "value": actorData.data.spells.spell2.value ? actorData.data.spells.spell2.value : "0"
            },
            "slot3": {
              "type": "Number",
              "label": "3rd Level",
              "prepared": actorData.data.spells.spell3.prepared ? actorData.data.spells.spell3.prepared : [],
              "max": actorData.data.spells.spell3.max ? actorData.data.spells.spell3.max : "0",
              "value": actorData.data.spells.spell3.value ? actorData.data.spells.spell3.value : "0"
            },
            "slot4": {
              "type": "Number",
              "label": "4th Level",
              "prepared": actorData.data.spells.spell4.prepared ? actorData.data.spells.spell4.prepared : [],
              "max": actorData.data.spells.spell4.max ? actorData.data.spells.spell4.max : "0",
              "value": actorData.data.spells.spell4.value ? actorData.data.spells.spell4.value : "0"
            },
            "slot5": {
              "type": "Number",
              "label": "5th Level",
              "prepared": actorData.data.spells.spell5.prepared ? actorData.data.spells.spell5.prepared : [],
              "max": actorData.data.spells.spell5.max ? actorData.data.spells.spell5.max : "0",
              "value": actorData.data.spells.spell5.value ? actorData.data.spells.spell5.value : "0"
            },
            "slot6": {
              "type": "Number",
              "label": "6th Level",
              "prepared": actorData.data.spells.spell6.prepared ? actorData.data.spells.spell6.prepared : [],
              "max": actorData.data.spells.spell6.max ? actorData.data.spells.spell6.max : "0",
              "value": actorData.data.spells.spell6.value ? actorData.data.spells.spell6.value : "0"
            },
            "slot7": {
              "type": "Number",
              "label": "7th Level",
              "prepared": actorData.data.spells.spell7.prepared ? actorData.data.spells.spell7.prepared : [],
              "max": actorData.data.spells.spell7.max ? actorData.data.spells.spell7.max : "0",
              "value": actorData.data.spells.spell7.value ? actorData.data.spells.spell7.value : "0"
            },
            "slot8": {
              "type": "Number",
              "label": "8th Level",
              "prepared": actorData.data.spells.spell8.prepared ? actorData.data.spells.spell8.prepared : [],
              "max": actorData.data.spells.spell8.max ? actorData.data.spells.spell8.max : "0",
              "value": actorData.data.spells.spell8.value ? actorData.data.spells.spell8.value : "0"
            },
            "slot9": {
              "type": "Number",
              "label": "9th Level",
              "prepared": actorData.data.spells.spell9.prepared ? actorData.data.spells.spell9.prepared : [],
              "max": actorData.data.spells.spell9.max ? actorData.data.spells.spell9.max : "0",
              "value": actorData.data.spells.spell9.value ? actorData.data.spells.spell9.value : "0"
            }        ,
            "slot10": {
              "type": "Number",
              "label": "10th Level",
              "prepared": actorData.data.spells.spell10.prepared ? actorData.data.spells.spell10.prepared : [],
              "max": actorData.data.spells.spell10.max ? actorData.data.spells.spell10.max : "0",
              "value": actorData.data.spells.spell10.value ? actorData.data.spells.spell10.value : "0"
            },
            "slot11": {
              "type": "Number",
              "label": "Focus",
              "prepared": actorData.data.spells.spell11.prepared ? actorData.data.spells.spell11.prepared : [],
              "max": actorData.data.spells.spell11.max ? actorData.data.spells.spell11.max : "0",
              "value": actorData.data.spells.spell11.value ? actorData.data.spells.spell11.value : "0"
            }
          }
        }

        let itemData = {
          "name": name,
          "type": "spellcastingEntry",
          "data": spellcastingEntity
        }

        /* 
        * Update Nature to use Wisdom
        */      
        if (actorData.data.skills.nat.ability === "int") {
          let key = "data.skills.nat.ability";
          deltaData[key] = "wis";
        }

        /* 
        * Update Actors schema version
        */
        deltaData["data.schema.version.value"] = version;

        //this.actor.update({"data.attributes.hp.value": hp, "data.attributes.hp.max": hp});

        // apply changes to actor
        console.log(`PF2e System | Adding Spellcasting Entry to ${actorData._id} (${actorData.name})`);
        await actor.createOwnedItem(itemData, {renderSheet: false}).then(async spellcastingEntry => {
          console.log(`PF2e System | Spellcasting Entry Item Location:`, spellcastingEntry.data.id)
          let location = spellcastingEntry.data.id;
          for (let i of actorData.items) {
            if (i.type === "spell") {
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

  game.settings.register("pf2e", "worldSchemaVersion", {
    name: "Actor Schema Version",
    hint: "Records the schema version for PF2e system actor data. (don't modify this unless you know what you are doing)",
    scope: "world",
    config: true,
    default: 0,
    type: Number
  })

  const isGM = game.user.isGM;
        

  if (isGM) {
    const systemSchemaVersion = Number(game.system.data.schema),
          worldSchemaVersion = Number(game.settings.get("pf2e", "worldSchemaVersion"));

    if (systemSchemaVersion > worldSchemaVersion) {
      for (let actor of game.actors.entities) {
        PF2eActorSchema.updataActor(actor, systemSchemaVersion);
      } 
      game.settings.set("pf2e", "worldSchemaVersion", systemSchemaVersion);
    } else {
      console.log(`PF2e System | World Schema matches System Schema. No migration required`)
    }
  }

})();

/**
 * Activate certain behaviors on FVTT ready hook
 */
Hooks.once("init", () => {
  
  

  // Pre-load templates
  loadTemplates([

    // Actor Sheet Partials (Tabs)
    "public/systems/pf2e/templates/actors/tabs/actor-actions.html",
    "public/systems/pf2e/templates/actors/tabs/actor-biography.html",
    "public/systems/pf2e/templates/actors/tabs/actor-feats.html",
    "public/systems/pf2e/templates/actors/tabs/actor-inventory.html",
    "public/systems/pf2e/templates/actors/tabs/actor-skills.html",
    "public/systems/pf2e/templates/actors/tabs/actor-spellbook.html",

    // Actor Sheet Partials (Legacy)
    "public/systems/pf2e/templates/actors/actor-attributes.html",
    "public/systems/pf2e/templates/actors/actor-abilities.html",    
    "public/systems/pf2e/templates/actors/actor-traits.html",
    "public/systems/pf2e/templates/actors/actor-classes.html",

    // Item Sheet Partials
    "public/systems/pf2e/templates/items/action-details.html",
    "public/systems/pf2e/templates/items/action-sidebar.html",
    "public/systems/pf2e/templates/items/armor-details.html",
    "public/systems/pf2e/templates/items/armor-sidebar.html",
    "public/systems/pf2e/templates/items/backpack-sidebar.html",
    "public/systems/pf2e/templates/items/class-sidebar.html",
    "public/systems/pf2e/templates/items/consumable-details.html",
    "public/systems/pf2e/templates/items/consumable-sidebar.html",
    "public/systems/pf2e/templates/items/equipment-details.html",
    "public/systems/pf2e/templates/items/equipment-sidebar.html",
    "public/systems/pf2e/templates/items/feat-details.html",
    "public/systems/pf2e/templates/items/feat-sidebar.html",
    "public/systems/pf2e/templates/items/lore-sidebar.html",
    "public/systems/pf2e/templates/items/spell-details.html",
    "public/systems/pf2e/templates/items/spell-sidebar.html",
    "public/systems/pf2e/templates/items/tool-sidebar.html",
    "public/systems/pf2e/templates/items/melee-details.html",
    "public/systems/pf2e/templates/items/weapon-details.html",
    "public/systems/pf2e/templates/items/weapon-sidebar.html"
  ]);





  /* -------------------------------------------- */

  /**
   * Override the default Initiative formula to customize special behaviors of the D&D5e system.
   * Apply advantage, proficiency, or bonuses where appropriate
   * Apply the dexterity score as a decimal tiebreaker if requested
   * See Combat._getInitiativeFormula for more detail.
   * @private
   */
  Combat.prototype._getInitiativeFormula = function(combatant) {
    const actor = combatant.actor;
    if ( !actor ) return "1d20";
    const data = actor ? actor.data.data : {},
          parts = ["1d20", data.attributes.perception.value];

/*     // Advantage on Initiative
    if ( actor.getFlag("dnd5e", "initiativeAdv") ) parts[0] = "2d20kh";

    // Half-Proficiency to Initiative
    if ( actor.getFlag("dnd5e", "initiativeHalfProf") ) {
      parts.push(Math.floor(0.5 * data.attributes.prof.value))
    }

    // Alert Bonus to Initiative
    if ( actor.getFlag("dnd5e", "initiativeAlert") ) parts.push(5);

    // Dexterity tiebreaker
    if ( CONFIG.initiative.tiebreaker ) parts.push(data.abilities.dex.value / 100); */
    return parts.join("+");
  }
});

/**
 * Activate certain behaviors on Canvas Initialization hook (thanks for MooMan for this snippet)
 */
Hooks.on("canvasInit", async () => {

  /**
   * Double every other diagonal movement
   */
  SquareGrid.prototype.measureDistance = function(p0, p1) {
    let gs = canvas.dimensions.size,
        ray = new Ray(p0, p1),
        nx = Math.abs(Math.ceil(ray.dx / gs)),
        ny = Math.abs(Math.ceil(ray.dy / gs));

    // Get the number of straight and diagonal moves
    let nDiagonal = Math.min(nx, ny),
        nStraight = Math.abs(ny - nx);

    let nd10 = Math.floor(nDiagonal / 2);
    let spaces = (nd10 * 2) + (nDiagonal - nd10) + nStraight;
    return spaces * canvas.dimensions.distance;  

  }
});