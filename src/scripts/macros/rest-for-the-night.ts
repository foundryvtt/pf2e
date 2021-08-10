import { CharacterPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import { ActionDefaultOptions } from "@system/actions/actions";

const levelMultiplier = (actor: CharacterPF2e) =>
    actor.itemTypes.feat.filter((item) => ["fast-recovery", "dream-may"].includes(item.slug ?? "")).length + 1;

/** A macro for the Rest for the Night quasi-action */
export async function restForTheNight(options: ActionDefaultOptions): Promise<void> {
    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const characters = actors.filter((actor): actor is CharacterPF2e => actor?.data.type === "character");
    if (actors.length === 0) {
        ui.notifications.warn("Select at least one token representing a character.");
        return;
    }

    if (!(await Dialog.confirm({ title: "Rest", content: "<p>Rest for the night?</p>", defaultYes: true }))) return;

    for (const actor of characters) {
        const abilities = actor.data.data.abilities;
        const attributes = actor.attributes;
        const focus = actor.data.data.resources.focus;

        // Hit points
        const conModifier = abilities.con.mod;
        const level = actor.level;
        const maxRestored = Math.max(conModifier, 1) * level * levelMultiplier(actor);
        const hpLost = attributes.hp.max - attributes.hp.value;
        const hpRestored = hpLost >= maxRestored ? maxRestored : hpLost;
        attributes.hp.value += hpRestored;

        // Conditions
        const RECOVERABLE_CONDITIONS = ["doomed", "drained", "fatigued"] as const;
        const conditionChanges: Record<typeof RECOVERABLE_CONDITIONS[number], "removed" | "reduced" | null> = {
            doomed: null,
            drained: null,
            fatigued: null,
        };

        // Fatigued condition
        if (actor.hasCondition("fatigued")) {
            actor.decreaseCondition("fatigued");
            conditionChanges.fatigued = "removed";
        }

        // Doomed and Drained conditions
        for await (const slug of ["doomed", "drained"] as const) {
            const condition = actor.getCondition(slug);
            if (!condition) continue;

            const newValue = (condition.value ?? 1) - 1;
            await actor.decreaseCondition(slug);
            conditionChanges[slug] = newValue === 0 ? "removed" : "reduced";
        }

        const items = actor.itemTypes;

        // Restore daily consumable charges
        const uncharged = items.consumable.filter((item) => item.uses.per === "day" && item.uses.value < item.uses.max);
        const updateData: EmbeddedDocumentUpdateData<ItemPF2e>[] = uncharged.map((item) => ({
            _id: item.id,
            "data.uses.value": item.uses.max,
        }));

        // Restore focus points
        const rechargeFocus = focus?.max && focus.value < focus.max;
        if (focus && rechargeFocus) {
            focus.value = focus.max;
        }

        // Spellcasting entries
        const restoredList: string[] = [];
        const entries = items.spellcastingEntry;
        const entriesUpdateData = entries.flatMap((entry) => {
            // Innate, Spontaneous, and Prepared spells
            const slots = entry.data.data.slots;
            let updated = false;
            for (const slot of Object.values(slots)) {
                if (entry.isSpontaneous || entry.isInnate) {
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
                restoredList.push(entry.isFocusPool ? "Focus Pool" : `${entry.name} spell slots`);
                return { _id: entry.id, "data.slots": slots };
            }
            return [];
        });

        updateData.push(...entriesUpdateData);

        // Stamina points
        const staminaEnabled = !!game.settings.get("pf2e", "staminaVariant");

        if (staminaEnabled) {
            const stamina = attributes.sp;
            const keyAbility = actor.keyAbility;
            if (stamina.value < stamina.max) {
                stamina.value = stamina.max;
                restoredList.push("Stamina");
            }
            const resolve = attributes.resolve;
            const maxResolve = abilities[keyAbility].mod;
            if (resolve.value < maxResolve) {
                resolve.value = maxResolve;
                restoredList.push("Resolve");
            }
        }

        // Updated actor with the sweet fruits of rest
        if (hpRestored > 0 || restoredList.length > 0) {
            actor.update({ "data.attributes": attributes, "data.resources.focus": focus });
        }
        if (updateData.length > 0) {
            actor.updateEmbeddedDocuments("Item", updateData);
        }

        // Construct messages
        const actorName = actor.getActiveTokens()[0]?.name ?? actor.name;
        const messages: (string | null)[] = [`${actorName} awakens well-rested.`];

        // Hit-point restoration
        if (hpRestored > 0) {
            messages.push(`${hpRestored} hit points restored.`);
        }

        // Wand and any daily consumable recharge
        if (uncharged.length) {
            messages.push("Daily consumables recharged.");
        }

        if (rechargeFocus) {
            messages.push("Focus points restored.");
        }

        // Attribute restoration
        const restoredString =
            restoredList.length === 0
                ? ""
                : restoredList.length === 1
                ? `${restoredList[0]}`
                : restoredList.length === 2
                ? `${restoredList.join(" and ")}`
                : `${restoredList.slice(0, -1).join(", ")}, and ` + `${restoredList.slice(-1)[0]}`;
        messages.push(restoredList.length > 0 ? `${restoredString} fully restored.` : null);

        // Condition removal
        const removedConditions = RECOVERABLE_CONDITIONS.filter((key) => conditionChanges[key] === "removed").map(
            (key) => key.capitalize()
        );
        const removedString =
            removedConditions.length === 0
                ? ""
                : removedConditions.length === 1
                ? `${removedConditions[0]}`
                : removedConditions.length === 2
                ? `${removedConditions.join(" or ")}`
                : `${restoredList.slice(0, -1).join(", ")}, or ` + `${restoredList.slice(-1)[0]}`;
        messages.push(removedConditions.length > 0 ? `No longer ${removedString}.` : null);

        // Condition value reduction
        const reducedConditions = RECOVERABLE_CONDITIONS.filter((key) => conditionChanges[key] === "reduced").map(
            (key) => key.capitalize()
        );
        const reducedString =
            reducedConditions.length === 0
                ? ""
                : reducedConditions.length === 1
                ? `${reducedConditions[0]} condition`
                : `${reducedConditions.join(" and ")} conditions`;
        messages.push(reducedConditions.length > 0 ? `${reducedString} reduced by 1.` : null);

        // Send chat message with results
        ChatMessage.create({
            user: game.user.id,
            content: messages.join(" "),
            speaker: { alias: actorName },
        });
    }
}
