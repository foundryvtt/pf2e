/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function() {
  const systemSchemaVersion = Number(game.system.data.schema);
  const worldSchemaVersion = Number(game.settings.get("pf2e", "worldSchemaVersion"));

  ui.notifications.info(`Applying PF2E System Migration to version ${systemSchemaVersion}. Please be patient and do not close your game or shut down your server.`, {permanent: true});

  // Migrate World Actors
  for ( let a of game.actors.entities ) {
    try {
      const updateData = migrateActorData(a.data, worldSchemaVersion);
      if ( !isObjectEmpty(updateData) ) {
        console.log(`Migrating Actor entity ${a.name}`);
        await a.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      console.error(err);
    }
  }

  // Migrate World Items
  for ( let i of game.items.entities ) {
    try {
      const updateData = migrateItemData(i.data);
      if ( !isObjectEmpty(updateData) ) {
        console.log(`Migrating Item entity ${i.name}`);
        await i.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      console.error(err);
    }
  }

  // Migrate Actor Override Tokens
  for ( let s of game.scenes.entities ) {
    try {
      const updateData = migrateSceneData(s.data, worldSchemaVersion);
      if ( !isObjectEmpty(updateData) ) {
        console.log(`Migrating Scene entity ${s.name}`);
        await s.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      console.error(err);
    }
  }
/*
  // Migrate World Compendium Packs
  const packs = game.packs.filter(p => {
    return (p.metadata.package === "world") && ["Actor", "Item", "Scene"].includes(p.metadata.entity)
  });
  for ( let p of packs ) {
    await migrateCompendium(p);
  }
*/
  // Set the migration as complete
  game.settings.set("pf2e", "worldSchemaVersion", systemSchemaVersion);
  ui.notifications.info(`PF2E System Migration to version ${systemSchemaVersion} completed!`, {permanent: true});
};

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
export const migrateCompendium = async function(pack) {
  const entity = pack.metadata.entity;
  if ( !["Actor", "Item", "Scene"].includes(entity) ) return;

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate();
  const content = await pack.getContent();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for ( let ent of content ) {
    try {
      let updateData = null;
      if (entity === "Item") updateData = migrateItemData(ent.data);
      else if (entity === "Actor") updateData = migrateActorData(ent.data);
      else if ( entity === "Scene" ) updateData = migrateSceneData(ent.data);
      if (!isObjectEmpty(updateData)) {
        expandObject(updateData);
        updateData["_id"] = ent._id;
        await pack.updateEntity(updateData);
        console.log(`Migrated ${entity} entity ${ent.name} in Compendium ${pack.collection}`);
      }
    } catch(err) {
      console.error(err);
    }
  }
  console.log(`Migrated all ${entity} entities from Compendium ${pack.collection}`);
};

/* -------------------------------------------- */
/*  Entity Type Migration Helpers               */
/* -------------------------------------------- */

/**
 * Migrate a single Actor entity to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {Actor} actor   The actor to Update
 * @param {worldSchemaVersion} actor   The current worldSchemaVersion
 * @return {Object}       The updateData to apply
 */
export const migrateActorData = function(actor, worldSchemaVersion) {
  const updateData = {};

  if (worldSchemaVersion < 0.544) _migrateStaminaVariant(updateData);

  if (worldSchemaVersion < 0.573) _migrateActorLanguages(actor, updateData);
  
  if (actor.type === "npc") {
    if (worldSchemaVersion < 0.559) _migrateNPCItemDamageRolls(actor, updateData);

    if (worldSchemaVersion < 0.566) _migrateNPCItemAttackEffects(actor, updateData);
    
    if (worldSchemaVersion < 0.571) updateData['data.traits.rarity.value'] = 'common';
  } else if (actor.type === "character") {
    if (worldSchemaVersion < 0.412) _migrateDyingCondition(updateData);

    if (worldSchemaVersion < 0.561) _migrateHitPointData(actor, updateData);

    if (worldSchemaVersion < 0.567) {
      _migrateClassDC(updateData);
      updateData['data.attributes.bonusbulk'] = 0;
    }
  }
  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single Item entity to incorporate latest data model changes
 * @param item
 */
export const migrateItemData = function(item) {
  const updateData = {};

  // Remove deprecated fields
  //_migrateRemoveDeprecated(item, updateData);
    if (worldSchemaVersion < 0.574) {
        if (["weapon", "melee", "armor", "equipment", "consumable", "backpack"].includes(item.type)) {
            updateData['data.stackGroup.value'] = '';
            updateData['data.unequippedBulk.value'] = '';
        }
    }
  // Return the migrated update data
  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single Scene entity to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @param {worldSchemaVersion} actor   The current worldSchemaVersion
 * @return {Object}       The updateData to apply
 */
export const migrateSceneData = function(scene, worldSchemaVersion) {
  const tokens = duplicate(scene.tokens);
  return {
    tokens: tokens.map(t => {
      if (!t.actorId || t.actorLink || !t.actorData.data) {
        t.actorData = {};
        return t;
      }
      const token = new Token(t);
      if ( !token.actor ) {
        t.actorId = null;
        t.actorData = {};
      } else if ( !t.actorLink ) {
        const updateData = migrateActorData(token.data.actorData, worldSchemaVersion);
        t.actorData = mergeObject(token.data.actorData, updateData);
      }
      return t;
    })
  };
};

/* -------------------------------------------- */
/*  Low level migration utilities
/* -------------------------------------------- */

/**
 * Migrate the actor bonuses object
 * @private
 */
/*function _migrateActorBonuses(actor, updateData) {
  const b = game.system.model.Actor.character.bonuses;
  for ( let k of Object.keys(actor.data.bonuses || {}) ) {
    if ( k in b ) updateData[`data.bonuses.${k}`] = b[k];
    else updateData[`data.bonuses.-=${k}`] = null;
  }
}*/

function _migrateActorLanguages(actor, updateData) {
  if (actor.data?.traits?.languages?.value) {
    updateData['data.traits.languages.value'] = actor.data.traits.languages.value.map( (language) => {
      const l = language.toString().toLowerCase();
      if (l === 'dwarvish')
        return 'dwarven';
      else
        return l;
    });
  }
}

function _migrateHitPointData(actor, updateData) {
  updateData['data.attributes.flatbonushp'] = parseInt((actor.data.attributes.flatbonushp || {}).value) || 0; 
  updateData['data.attributes.levelbonushp'] = parseInt((actor.data.attributes.levelbonushp || {}).value) || 0; 
  updateData['data.attributes.flatbonussp'] = parseInt((actor.data.attributes.flatbonussp || {}).value) || 0;
  updateData['data.attributes.levelbonussp'] = parseInt((actor.data.attributes.levelbonussp || {}).value) || 0;
  updateData['data.attributes.ancestryhp'] = parseInt((actor.data.attributes.ancestryhp || {}).value) || 0;
  updateData['data.attributes.classhp'] = parseInt((actor.data.attributes.classhp || {}).value) || 0;
}

function _migrateNPCItemAttackEffects(actor, updateData) {
  if (!actor.items) return;
  let updatedItems = [];
  const items = duplicate(actor.items);

  items.forEach(item => {
    let updatedItem = item;
    if (item.type === 'melee' && item.data.attackEffects) {
      let attackEffects = {
        'value': item.data.attackEffects
      };
      updatedItem.data.attackEffects = attackEffects;
    }
      updatedItems.push(updatedItem);
  });
  updateData['items'] = updatedItems;
}

function _migrateNPCItemDamageRolls(actor, updateData) {
  if (!actor.items) return;
  let updatedItems = [];
  const items = duplicate(actor.items);

  items.forEach(item => {
    let updatedItem = item;
    if (item.type === 'melee' && item.data.damage.die) {
      let damageRolls = {
        'migrated': {
          damage: item.data.damage.die,
          damageType: item.data.damage.damageType
        }
      };
      updatedItem.data.damageRolls = damageRolls;
     }
     updatedItems.push(updatedItem);
});
updateData['items'] = updatedItems;
}

function _migrateClassDC(updateData) {
  const classDC = {
    "rank": 0,
    "ability": "str",
    "item": 0,
    "value": 0,
    "breakdown": ""
  }
  updateData['data.attributes.classDC'] = classDC;
}

function _migrateStaminaVariant(updateData) {
  updateData['data.attributes.sp'] = {}; 
  updateData['data.attributes.sp.min'] = 0; 
  updateData['data.attributes.sp.max'] = 0; 
  updateData['data.attributes.sp.value'] = 0; 

  updateData['data.attributes.resolve'] = {}; 
  updateData['data.attributes.resolve.value'] = 0; 

  updateData['data.details.keyability'] = {};
  updateData['data.details.keyability.value'] = "str";
}

function _migrateDyingCondition(updateData) {
  updateData['data.attributes.dying'] = {};
  updateData['data.attributes.dying.value'] = 0;
  updateData['data.attributes.dying.max'] = 4;

  updateData['data.attributes.wounded'] = {};
  updateData['data.attributes.wounded.value'] = 0;
  updateData['data.attributes.wounded.max'] = 3;

  updateData['data.attributes.doomed'] = {};
  updateData['data.attributes.doomed.value'] = 0;
  updateData['data.attributes.doomed.max'] = 3;  
}
/* -------------------------------------------- */


/**
 * A general migration to remove all fields from the data model which are flagged with a _deprecated tag
 * @private
 */
/*const _migrateRemoveDeprecated = function(ent, updateData) {
  const flat = flattenObject(ent.data);

  // Identify objects to deprecate
  const toDeprecate = Object.entries(flat).filter(e => e[0].endsWith("_deprecated") && (e[1] === true)).map(e => {
    let parent = e[0].split(".");
    parent.pop();
    return parent.join(".");
  });

  // Remove them
  for ( let k of toDeprecate ) {
    let parts = k.split(".");
    parts[parts.length-1] = "-=" + parts[parts.length-1];
    updateData[`data.${parts.join(".")}`] = null;
  }
};*/
