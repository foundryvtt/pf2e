/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
import { calculateCarriedArmorBulk, fixWeight } from './item/bulk.js';
import { toNumber } from './utils.js';

export const migrateWorld = async function () {
    const systemVersion = game.system.data.version;
    const systemSchemaVersion = Number(game.system.data.schema);
    const worldSchemaVersion = Number(game.settings.get('pf2e', 'worldSchemaVersion'));

    ui.notifications.info(`Applying PF2E System Migration to version ${systemVersion}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

    // Migrate World Actors
    for (let a of game.actors.entities) {
        try {
            const updateData = migrateActorData(a.data, worldSchemaVersion);
            if (!isObjectEmpty(updateData)) {
                console.log(`Migrating Actor entity ${a.name}`);
                await a.update(updateData, { enforceTypes: false });
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Migrate World Items
    for (let i of game.items.entities) {
        try {
            const updateData = migrateItemData(i.data, worldSchemaVersion);
            if (!isObjectEmpty(updateData)) {
                console.log(`Migrating Item entity ${i.name}`);
                await i.update(updateData, { enforceTypes: false });
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Migrate Actor Override Tokens
    for (let s of game.scenes.entities) {
        try {
            const updateData = migrateSceneData(s.data, worldSchemaVersion);
            if (!isObjectEmpty(updateData)) {
                console.log(`Migrating Scene entity ${s.name}`);
                await s.update(updateData, { enforceTypes: false });
            }
        } catch (err) {
            console.error(err);
        }
    }

    //Migrate World Compendium Packs
    const packs = game.packs.filter(p => {
        return (p.metadata.package === 'pf2e') && ['Actor', 'Item', 'Scene'].includes(p.metadata.entity);
    });
    for (let p of packs) {
        //await migrateCompendium(p, worldSchemaVersion);
    }

    // special migrations
    if (worldSchemaVersion < 0.576) {
        for (let a of game.actors.entities) {
            try {
                await migrateCoins(a);
            } catch (err) {
                console.error(err);
            }
        }
    }
    // Set the migration as complete
    game.settings.set('pf2e', 'worldSchemaVersion', systemSchemaVersion);
    ui.notifications.info(`PF2E System Migration to version ${systemVersion} completed!`, { permanent: true });
};

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
export const migrateCompendium = async function (pack, worldSchemaVersion) {
    const entity = pack.metadata.entity;
    if (!['Actor', 'Item', 'Scene'].includes(entity)) return;

    // Begin by requesting server-side data model migration and get the migrated content
    await pack.migrate();
    const content = await pack.getContent();

    // Iterate over compendium entries - applying fine-tuned migration functions
    for (let ent of content) {
        try {
            let updateData = null;
            if (entity === 'Item') {
                updateData = migrateItemData(ent.data, worldSchemaVersion);
            } else if (entity === 'Actor') {
                updateData = migrateActorData(ent.data, worldSchemaVersion);
            } else if (entity === 'Scene') updateData = migrateSceneData(ent.data, worldSchemaVersion);
            if (!isObjectEmpty(updateData)) {
                expandObject(updateData);
                updateData['_id'] = ent._id;
                await pack.updateEntity(updateData);
                console.log(`Migrated ${entity} entity ${ent.name} in Compendium ${pack.collection}`);
            }
        } catch (err) {
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
export const migrateActorData = function (actor, worldSchemaVersion) {
    const updateData = {};

    if (worldSchemaVersion < 0.544) _migrateStaminaVariant(updateData);

    if (worldSchemaVersion < 0.573) _migrateActorLanguages(actor, updateData);

    if (worldSchemaVersion < 0.578) {
        migrateActorItemImages(actor, updateData);
    }

    if (actor.type === 'npc') {
        if (worldSchemaVersion < 0.559) _migrateNPCItemDamageRolls(actor, updateData);

        if (worldSchemaVersion < 0.566) _migrateNPCItemAttackEffects(actor, updateData);

        if (worldSchemaVersion < 0.571) updateData['data.traits.rarity.value'] = 'common';
    } else if (actor.type === 'character') {
        if (worldSchemaVersion < 0.412) _migrateDyingCondition(updateData);

        if (worldSchemaVersion < 0.561) _migrateHitPointData(actor, updateData);

        if (worldSchemaVersion < 0.567) {
            _migrateClassDC(updateData);
            updateData['data.attributes.bonusbulk'] = 0;
        }
        if (worldSchemaVersion < 0.574) {
            migrateActorBulkItems(actor, updateData);
        }
        if (worldSchemaVersion < 0.579) {
            addActorContainerAttributes(actor, updateData);
        }

        if (worldSchemaVersion < 0.580) {
            migrateActorItems(actor, updateData, addItemRarityAndLevel);
            _migrateActorOtherSpeeds(actor, updateData);
        }

        if (worldSchemaVersion < 0.582) {
            migrateActorItems(actor, updateData, addWeaponPotencyRune);
        }

        if (worldSchemaVersion < 0.583) {
            migrateActorBonusBulk(actor, updateData);
            migrateActorItems(actor, updateData, addHpThresholdHardness);
        }

        if (worldSchemaVersion < 0.584) {
            updateData['data.details.ethnicity.value'] = '';
            updateData['data.details.nationality.value'] = '';
        }
    }
    return updateData;
};

/* -------------------------------------------- */
function addWeaponPotencyRune(item, itemData) {
    if (item.type === 'weapon') {
        const bonusAttack = toNumber(item.data?.bonus?.value ?? '') ?? 0;
        if (bonusAttack > 0 && bonusAttack < 5) {
            itemData['data.potencyRune.value'] = `${bonusAttack}`;
        }
    }
    return itemData;
}

function addItemRarityAndLevel(item, itemData) {
    itemData['data.rarity.value'] = 'common';
    if (['treasure', 'backpack'].includes(item.type)) {
        itemData['data.level.value'] = '0';
    }
    return itemData;
}

function addContainerAttributes(item, itemData) {
    if (['weapon', 'melee', 'armor', 'equipment', 'consumable', 'backpack'].includes(item.type)) {
        const itemName = item?.name?.trim();
        if (itemName === 'Backpack') {
            itemData['data.bulkCapacity.value'] = '4';
            itemData['data.negateBulk.value'] = '2';
        } else if (itemName === 'Bag of Devouring Type I') {
            itemData['data.bulkCapacity.value'] = '50';
            itemData['data.negateBulk.value'] = '50';
        } else if (itemName === 'Bag of Devouring Type II') {
            itemData['data.bulkCapacity.value'] = '100';
            itemData['data.negateBulk.value'] = '100';
        } else if (itemName === 'Bag of Devouring Type III') {
            itemData['data.bulkCapacity.value'] = '150';
            itemData['data.negateBulk.value'] = '150';
        } else if (itemName === 'Bag of Holding (Type I)') {
            itemData['data.bulkCapacity.value'] = '25';
            itemData['data.negateBulk.value'] = '25';
        } else if (itemName === 'Bag of Holding (Type II)') {
            itemData['data.bulkCapacity.value'] = '50';
            itemData['data.negateBulk.value'] = '50';
        } else if (itemName === 'Bag of Holding (Type III)') {
            itemData['data.bulkCapacity.value'] = '100';
            itemData['data.negateBulk.value'] = '100';
        } else if (itemName === 'Bag of Holding (Type IV)') {
            itemData['data.bulkCapacity.value'] = '150';
            itemData['data.negateBulk.value'] = '150';
        } else if (itemName === 'Bag of Weasels') {
            itemData['data.bulkCapacity.value'] = '25';
            itemData['data.negateBulk.value'] = '25';
        } else if (itemName === 'Gloves of Carelessness') {
            itemData['data.bulkCapacity.value'] = '1';
            itemData['data.negateBulk.value'] = '1';
        } else if (itemName === 'Gloves of Storing') {
            itemData['data.bulkCapacity.value'] = '1';
            itemData['data.negateBulk.value'] = '1';
        } else if (itemName === 'Belt Pouch') {
            itemData['data.bulkCapacity.value'] = '4L';
            itemData['data.negateBulk.value'] = '0';
        } else if (itemName === 'Pathfinder\'s Pouch') {
            // FIXME: 1 bulk is in an extradimensional container
            itemData['data.bulkCapacity.value'] = '4L';
            itemData['data.negateBulk.value'] = '0';
        } else if (itemName === 'Knapsack of Halflingkind') {
            itemData['data.bulkCapacity.value'] = '50';
            itemData['data.negateBulk.value'] = '50';
        } else if (itemName === 'Knapsack of Halflingkind (Greater)') {
            itemData['data.bulkCapacity.value'] = '50';
            itemData['data.negateBulk.value'] = '50';
        } else if (itemName === 'Sack (5)') {
            itemData['data.bulkCapacity.value'] = '8';
            itemData['data.negateBulk.value'] = '0';
        } else if (itemName === 'Satchel') {
            itemData['data.bulkCapacity.value'] = '2';
            itemData['data.negateBulk.value'] = '0';
        } else if (itemName === 'Bandolier') {
            itemData['data.bulkCapacity.value'] = '8L';
            itemData['data.negateBulk.value'] = '0';
        } else if (itemName === 'Saddlebags') {
            // FIXME: a saddlebag has 2 parts, each one carrying 3 bulk
            itemData['data.bulkCapacity.value'] = '3';
            itemData['data.negateBulk.value'] = '0';
        } else if (itemName === 'Chest') {
            itemData['data.bulkCapacity.value'] = '8';
            itemData['data.negateBulk.value'] = '0';
        } else {
            itemData['data.bulkCapacity.value'] = '';
            itemData['data.negateBulk.value'] = '0';
        }
        itemData['data.containerId.value'] = '';
    }
    return itemData;
}

function addHpThresholdHardness(item, updateData) {
    if (['weapon', 'melee', 'armor', 'equipment', 'consumable', 'backpack'].includes(item.type)) {
        updateData['data.brokenThreshold.value'] = 0;
        updateData['data.hp.value'] = 0;
        updateData['data.maxHp.value'] = 0;
        updateData['data.hardness.value'] = 0;
    }
    return updateData;
}

async function addCoin(actorEntity, treasureId, denomination, quantity) {
    if (quantity !== null && (`${quantity}`).trim() !== '0') {
        console.log(`Adding ${quantity} of ${denomination} to actors ${actorEntity.data.name}'s inventory`);
        const pack = game.packs.find(p => p.collection === 'pf2e.equipment-srd');
        const item = await pack.getEntity(treasureId);
        item.data.data.quantity.value = quantity;
        actorEntity.createOwnedItem(item.data);
    }
}

async function migrateCoins(actorEntity) {
    console.log('Migrating coins');
    const coinCompendiumIds = {
        'pp': 'JuNPeK5Qm1w6wpb4',
        'gp': 'B6B7tBWJSqOBz5zz',
        'sp': '5Ew82vBF9YfaiY9f',
        'cp': 'lzJ8AVhRcbFul5fh',
    };
    const ppQuantity = actorEntity.data.data?.currency?.pp?.value ?? null;
    await addCoin(actorEntity, coinCompendiumIds.pp, 'pp', ppQuantity);

    const gpQuantity = actorEntity.data.data?.currency?.gp?.value ?? null;
    await addCoin(actorEntity, coinCompendiumIds.gp, 'gp', gpQuantity);

    const spQuantity = actorEntity.data.data?.currency?.sp?.value ?? null;
    await addCoin(actorEntity, coinCompendiumIds.sp, 'sp', spQuantity);

    const cpQuantity = actorEntity.data.data?.currency?.cp?.value ?? null;
    await addCoin(actorEntity, coinCompendiumIds.cp, 'cp', cpQuantity);
}

function migrateBulk(item, updateData) {
    const itemName = item?.name?.trim();
    if (['weapon', 'melee', 'armor', 'equipment', 'consumable', 'backpack'].includes(item.type)) {
        // migrate stacked items
        if (itemName?.includes('rrow')) {
            updateData['data.stackGroup.value'] = 'arrows';
        } else if (itemName?.includes('olt')) {
            updateData['data.stackGroup.value'] = 'bolts';
        } else if (itemName === 'Rations (1 week)') {
            updateData['data.stackGroup.value'] = 'rations';
        } else if (itemName === 'Blowgun Darts (10)') {
            updateData['data.stackGroup.value'] = 'blowgunDarts';
        } else if (itemName === 'Sling Bullets (10)') {
            updateData['data.stackGroup.value'] = 'slingBullets';
        } else {
            updateData['data.stackGroup.value'] = '';
        }
        // migrate armor
        if (item.type === 'armor') {
            const weight = item.data?.weight?.value ?? '';
            updateData['data.equippedBulk.value'] = fixWeight(weight) ?? '';
            updateData['data.weight.value'] = calculateCarriedArmorBulk(weight);
        } else if (itemName === 'Backpack') {
            updateData['data.weight.value'] = 'L';
            updateData['data.equippedBulk.value'] = '0';
        } else if (itemName === 'Satchel') {
            updateData['data.weight.value'] = 'L';
            updateData['data.equippedBulk.value'] = '0';
        } else if (itemName === 'Bandolier') {
            updateData['data.weight.value'] = 'L';
            updateData['data.equippedBulk.value'] = '0';
        } else if (itemName === 'Saddlebags') {
            updateData['data.weight.value'] = '1';
            updateData['data.equippedBulk.value'] = 'L';
        } else if (itemName === 'Tack') {
            updateData['data.weight.value'] = '2';
            updateData['data.equippedBulk.value'] = '1';
        } else {
            updateData['data.equippedBulk.value'] = '';
        }
    }
    return updateData;
}

/**
 * Migrate a single Item entity to incorporate latest data model changes
 * @param item
 */
export const migrateItemData = function (item, worldSchemaVersion) {
    const updateData = {};
    // Remove deprecated fields
    //_migrateRemoveDeprecated(item, updateData);
    if (worldSchemaVersion < 0.574) {
        migrateBulk(item, updateData);
    }
    if (worldSchemaVersion < 0.579) {
        addContainerAttributes(item, updateData);
    }

    if (worldSchemaVersion < 0.580) {
        addItemRarityAndLevel(item, updateData);
    }

    if (worldSchemaVersion < 0.582) {
        addWeaponPotencyRune(item, updateData);
    }

    if (worldSchemaVersion < 0.583) {
        addHpThresholdHardness(item, updateData);
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
export const migrateSceneData = function (scene, worldSchemaVersion) {
    const tokens = duplicate(scene.tokens);
    return {
        tokens: tokens.map(t => {
            const token = new Token(t);
            if (!token.actor) {
                t.actorId = null;
                t.actorData = {};
            } else if (!t.actorLink) {
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
        updateData['data.traits.languages.value'] = actor.data.traits.languages.value.map((language) => {
            const l = language.toString()
                .toLowerCase();
            if (l === 'dwarvish') {
                return 'dwarven';
            } else {
                return l;
            }
        });
    }
}

function _migrateActorOtherSpeeds(actor, updateData) {
    if (typeof actor.data?.attributes?.speed?.otherSpeeds !== 'array') {
        updateData['data.attributes.speed.otherSpeeds'] = [];
    }
}

function migrateActorBonusBulk(actor, updateData) {
    updateData['data.attributes.bonusLimitBulk'] = actor.data.attributes.bonusbulk || 0;
    updateData['data.attributes.bonusEncumbranceBulk'] = actor.data.attributes.bonusbulk || 0;
}

function _migrateHitPointData(actor, updateData) {
    updateData['data.attributes.flatbonushp'] = parseInt((actor.data.attributes.flatbonushp || {}).value) || 0;
    updateData['data.attributes.levelbonushp'] = parseInt((actor.data.attributes.levelbonushp || {}).value) || 0;
    updateData['data.attributes.flatbonussp'] = parseInt((actor.data.attributes.flatbonussp || {}).value) || 0;
    updateData['data.attributes.levelbonussp'] = parseInt((actor.data.attributes.levelbonussp || {}).value) || 0;
    updateData['data.attributes.ancestryhp'] = parseInt((actor.data.attributes.ancestryhp || {}).value) || 0;
    updateData['data.attributes.classhp'] = parseInt((actor.data.attributes.classhp || {}).value) || 0;
}

function migrateActorItems(actor, updateData, itemUpdateFunction) {
    if (!actor.items) return;
    let updatedItems = [];
    const items = duplicate(actor.items);

    items.forEach(item => {
        let updatedItem = item;
        let updatedData = itemUpdateFunction(item, {});
        if (!isObjectEmpty(updatedData)) {
            updatedItem = mergeObject(updatedItem, updatedData);
        }
        updatedItems.push(updatedItem);
    });

    updateData['items'] = updatedItems;
}

function migrateActorBulkItems(actor, updateData) {
    return migrateActorItems(actor, updateData, migrateBulk);
}

function addActorContainerAttributes(actor, updateData) {
    return migrateActorItems(actor, updateData, addContainerAttributes);
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
        'rank': 0,
        'ability': 'str',
        'item': 0,
        'value': 0,
        'breakdown': ''
    };
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
    updateData['data.details.keyability.value'] = 'str';
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

async function migrateActorItemImages(actor, updateData) {
    if (!actor.items) return;
    let updatedItems = [];

    //actor.type can be 'character', 'npc' or undefined
    //Real actor. Use updateEmbeddedEntity()
    if (actor.type === 'character' || actor.type === 'npc') {
        actor.items.forEach(item => {
            let updatedItem = migrateImage(item, {});
            if (!isObjectEmpty(updatedItem)) {
                updatedItem._id = item._id;
                updatedItems.push(updatedItem);
            }
        });

        if (updatedItems.length) {
            const _actor = new Actor(actor);
            if (_actor) {
                await _actor.updateEmbeddedEntity('OwnedItem', updatedItems);
            }
        }
    }
}

function migrateImage(item, updateData) {
    const itemImage = item?.img;

    // folder name change
    if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical%20items/alchemical%20elixirs/')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical%20items/alchemical%20elixirs/', 'systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical%20items/')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical%20items/', 'systems/pf2e/icons/equipment/alchemical-items/');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/adventuring%20gear/')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/adventuring%20gear/', 'systems/pf2e/icons/equipment/adventuring-gear/');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/cursed%20items/')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/cursed%20items/', 'systems/pf2e/icons/equipment/cursed-items/');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/held%20items/')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/held%20items/', 'systems/pf2e/icons/equipment/held-items/');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/intelligent%20items/')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/intelligent%20items/', 'systems/pf2e/icons/equipment/intelligent-items/');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/worn%20items/')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/worn%20items/', 'systems/pf2e/icons/equipment/worn-items/');
    }

    // consumables subfolder
    else if (itemImage?.includes('systems/pf2e/icons/equipment/consumables/') && !itemImage?.includes('systems/pf2e/icons/equipment/consumables/potions/') && itemImage?.includes('potion')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/consumables/', 'systems/pf2e/icons/equipment/consumables/potions/');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/') && !itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/') && itemImage?.includes('elixir')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical-items/', 'systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/');
    }

    // specific icon changes
    else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/acid-flask.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical-items/acid-flask.jpg', 'systems/pf2e/icons/equipment/alchemical-items/alchemical-bombs/acid-flask.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/alchemists-fire.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical-items/alchemists-fire.jpg', 'systems/pf2e/icons/equipment/alchemical-items/alchemical-bombs/alchemists-fire.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/frost-vial.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical-items/frost-vial.jpg', 'systems/pf2e/icons/equipment/alchemical-items/alchemical-bombs/frost-vial.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/bombers-eye-elixir.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical-items/bombers-eye-elixir.jpg', 'systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/bombers-eye-elixir.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/antidote.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical-items/antidote.jpg', 'systems/pf2e/icons/equipment/alchemical-items/alchemical-elixirs/antidote.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/alchemical-items/bottled-lightning.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/alchemical-items/bottled-lightning.jpg', 'systems/pf2e/icons/equipment/alchemical-items/alchemical-bombs/bottled-lightning.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/held-items/platinum-pieces.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/held-items/platinum-pieces.jpg', 'systems/pf2e/icons/equipment/treasure/currency/platinum-pieces.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/held-items/gold-pieces.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/held-items/gold-pieces.jpg', 'systems/pf2e/icons/equipment/treasure/currency/gold-pieces.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/held-items/silver-pieces.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/held-items/silver-pieces.jpg', 'systems/pf2e/icons/equipment/treasure/currency/silver-pieces.jpg');
    } else if (itemImage?.includes('systems/pf2e/icons/equipment/held-items/copper-pieces.jpg')) {
        updateData['img'] = itemImage.replace('systems/pf2e/icons/equipment/held-items/copper-pieces.jpg', 'systems/pf2e/icons/equipment/treasure/currency/copper-pieces.jpg');
    }

    return updateData;
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
