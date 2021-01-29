const FAST_RECOVERY = 'Compendium.pf2e.feats-srd.N8Xz5fuW6o7GW124';
const DREAM_MAY = 'Compendium.pf2e.feats-srd.kqnFdIhToKTnOpMl';

const levelMultiplier = (actor) =>
    actor.items.filter((item) => [FAST_RECOVERY, DREAM_MAY].includes(item.data.flags.core?.sourceId)).length + 1;

const recover = () => {
    const Character = CONFIG.PF2E.Actor.entityClasses.character;
    const Condition = CONFIG.PF2E.Item.entityClasses.condition;
    const tokens = canvas.tokens.controlled.filter((token) => token.actor instanceof Character);

    if (tokens.length === 0) {
        ui.notifications.warning('Select at least one token.');
    }

    for (const token of tokens) {
        const actor = token.actor;
        const actorData = duplicate(actor.data);
        const items = Array.from(actor.items.values());
        const abilities = actorData.data.abilities;
        const attributes = actorData.data.attributes;

        // Hit points
        const conModifier = abilities.con.mod;
        const level = actorData.data.details.level.value;
        const maxRestored = Math.max(conModifier, 1) * level * levelMultiplier(actor);
        const hpLost = attributes.hp.max - attributes.hp.value;
        const hpRestored = hpLost >= maxRestored ? maxRestored : hpLost;
        attributes.hp.value += hpRestored;

        // Conditions
        const conditions = items.filter((item) => item.type === 'condition' && item.getFlag('pf2e', 'condition'));
        const conditionChanges = {};

        // Fatigued condition
        const fatigued = conditions.find((item) => item.name === 'Fatigued');
        if (fatigued instanceof Condition) {
            PF2eConditionManager.removeConditionFromToken(fatigued.id, token);
            conditionChanges.Fatigued = null;
        }

        // Doomed and Drained conditions
        for (const conditionName of ['Doomed', 'Drained']) {
            const doomedOrDrained = conditions.find((condition) => condition.name === conditionName);
            if (doomedOrDrained === undefined) {
                continue;
            }
            const value = doomedOrDrained.data.data.value.value;
            if (value === 1) {
                PF2eConditionManager.removeConditionFromToken(doomedOrDrained.id, token);
                conditionChanges[conditionName] = null;
            } else {
                const newValue = value - 1;
                PF2eConditionManager.updateConditionValue(doomedOrDrained.id, token, newValue);
                conditionChanges[conditionName] = newValue;
            }
        }

        // Restore wand charges

        const wands = items.filter((i) => i.data.data.consumableType?.value === 'wand');
        let wandRecharged = false;
        const updateData = wands.map((w) => {
            return { _id: w.id, 'data.charges.value': parseInt(w.data.data.charges.max) };
        });
        if (updateData.length > 0) {
            wandRecharged = true;
        }

        // Spellcasting entries
        const restoredList = [];
        const entries = items.filter((item) => item.type === 'spellcastingEntry');
        const entriesUpdateData = entries.flatMap((entry) => {
            const entryType = entry.data.data.prepared.value ? entry.data.data.prepared.value : 'focus';

            // Focus spells
            if (entryType === 'focus') {
                const focusPool = duplicate(entry.data.data.focus);
                if (focusPool.points < focusPool.pool) {
                    focusPool.points = focusPool.pool;
                    restoredList.push('Focus Pool');
                    return { _id: entry.id, 'data.focus': focusPool };
                }

                return [];
            }

            // Innate, Spontaneous, and Prepared spells
            const slots = entry.data.data.slots;
            let updated = false;
            for (const slot of Object.values(slots)) {
                if (['spontaneous', 'innate'].includes(entryType)) {
                    if (slot.value < slot.max) {
                        slot.value = slot.max;
                        updated = true;
                    }
                } else {
                    for (const preparedSpell of Object.values(slot.prepared)) {
                        if (preparedSpell.expended) {
                            preparedSpell.expended = false;
                            updated = true;
                        }
                    }
                }
            }

            if (updated) {
                restoredList.push(entryType === 'focus' ? 'Focus Pool' : `${entry.name} spell slots`);
                return { _id: entry.id, 'data.slots': slots };
            }
            return [];
        });

        updateData.push(...entriesUpdateData);

        // Stamina points
        const staminaSetting = game.settings.storage.get('world').get('pf2e.staminaVariant');
        const staminaEnabled = staminaSetting ? Boolean(parseInt(staminaSetting.replace(/"/g, ''), 10)) : false;

        if (staminaEnabled) {
            const stamina = attributes.sp;
            const keyAbility = actorData.data.details.keyability.value;
            if (stamina.value < stamina.max) {
                stamina.value = stamina.max;
                restoredList.push('Stamina');
            }
            const resolve = attributes.resolve;
            const maxResolve = abilities[keyAbility].mod;
            if (resolve.value < maxResolve) {
                resolve.value = maxResolve;
                restoredList.push('Resolve');
            }
        }

        // Updated actor with the sweet fruits of rest
        if (hpRestored > 0 || restoredList.length > 0) {
            actor.update({ 'data.attributes': attributes });
        }
        if (updateData.length > 0) {
            actor.updateOwnedItem(updateData);
        }

        // Construct messages
        const messages = [`${token.name} awakens well-rested.`];

        // Hit-point restoration
        if (hpRestored > 0) {
            messages.push(`${hpRestored} hit points restored.`);
        }

        // Wand recharge
        if (wandRecharged) {
            messages.push('Spellcasting wands recharged.');
        }

        // Attribute restoration
        const restoredString =
            restoredList.length === 0
                ? ''
                : restoredList.length === 1
                ? `${restoredList[0]}`
                : restoredList.length === 2
                ? `${restoredList.join(' and ')}`
                : `${restoredList.slice(0, -1).join(', ')}, and ` + `${restoredList.slice(-1)[0]}`;
        messages.push(restoredList.length > 0 ? `${restoredString} fully restored.` : null);

        // Condition removal
        const removedConditions = Object.keys(conditionChanges).filter((key) => conditionChanges[key] === null);
        const removedString =
            removedConditions.length === 0
                ? ''
                : removedConditions.length === 1
                ? `${removedConditions[0]}`
                : removedConditions.length === 2
                ? `${removedConditions.join(' or ')}`
                : `${restoredList.slice(0, -1).join(', ')}, or ` + `${restoredList.slice(-1)[0]}`;
        messages.push(removedConditions.length > 0 ? `No longer ${removedString}.` : null);

        // Condition value reduction
        const reducedConditions = Object.keys(conditionChanges).filter((key) =>
            Number.isInteger(conditionChanges[key]),
        );
        const reducedString =
            reducedConditions.length === 0
                ? ''
                : reducedConditions.length === 1
                ? `${reducedConditions[0]} condition`
                : `${reducedConditions.join(' and ')} conditions`;
        messages.push(reducedConditions.length > 0 ? `${reducedString} reduced by 1.` : null);

        // Send chat message with results
        ChatMessage.create({
            user: game.user.id,
            content: messages.join(' '),
            speaker: { alias: token.name },
        });
    }
};

new Dialog({
    title: 'Rest',
    content: '<p>Rest for the night?</p>',
    buttons: {
        yes: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Rest',
            callback: recover,
        },
        no: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
        },
    },
    default: 'yes',
}).render(true);
