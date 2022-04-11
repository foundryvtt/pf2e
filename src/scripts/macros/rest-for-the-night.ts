import { CharacterPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { ActionDefaultOptions } from "@system/action-macros";

/** A macro for the Rest for the Night quasi-action */
export async function restForTheNight(options: ActionDefaultOptions): Promise<void | ChatMessage> {
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
        const reagents = actor.data.data.resources.crafting.infusedReagents;

        // Hit points
        const conModifier = abilities.con.mod;
        const level = actor.level;
        const maxRestored = Math.max(conModifier, 1) * level * actor.hitPoints.recoveryMultiplier;
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

        // Restore wand charges
        const items = actor.itemTypes;
        const wands = items.consumable.filter(
            (item) => item.consumableType === "wand" && item.charges.current < item.charges.max
        );
        const updateData: EmbeddedDocumentUpdateData<ItemPF2e>[] = wands.map((wand) => ({
            _id: wand.id,
            "data.charges.value": 1,
        }));
        const wandRecharged = updateData.length > 0;

        // Restore reagents
        const restoreReagents = reagents?.max && reagents.value < reagents.max;
        if (reagents && restoreReagents) {
            reagents.value = reagents.max;
            actor.update({ "data.resources.crafting.infusedReagents.value": reagents.value });
        }

        // Construct messages
        const actorName = actor.getActiveTokens()[0]?.name ?? actor.name;
        const messages: (string | null)[] = [`${actorName} awakens well-rested.`];

        // Spellcasting entries and focus points
        const spellcastingRecharge = actor.spellcasting.recharge();
        updateData.push(...spellcastingRecharge.itemUpdates);

        // Stamina points
        const staminaEnabled = !!game.settings.get("pf2e", "staminaVariant");

        const restoredList: string[] = [];

        if (staminaEnabled) {
            const stamina = attributes.sp;
            if (stamina.value < stamina.max) {
                stamina.value = stamina.max;
                restoredList.push("Stamina");
            }
            const resolve = attributes.resolve;
            if (resolve.value < resolve.max) {
                resolve.value = resolve.max;
                restoredList.push("Resolve");
            }
        }

        // Updated actor with the sweet fruits of rest
        if (hpRestored > 0 || restoredList.length > 0 || spellcastingRecharge.actorUpdates) {
            actor.update({ "data.attributes": attributes, ...spellcastingRecharge.actorUpdates });
        }
        if (updateData.length > 0) {
            actor.updateEmbeddedDocuments("Item", updateData);
        }

        // Remove temporary crafted items
        const temporaryItems = actor.physicalItems.filter((item) => item.data.isTemporary);

        if (temporaryItems.length) {
            temporaryItems.forEach(async (item) => await item.delete());
        }

        // Hit-point restoration
        if (hpRestored > 0) {
            messages.push(`${hpRestored} hit points restored.`);
        }

        // Wand recharge
        if (wandRecharged) {
            messages.push("Wands recharged.");
        }

        if (spellcastingRecharge.actorUpdates) {
            messages.push("Focus points restored.");
        }

        if (spellcastingRecharge.itemUpdates.length) {
            messages.push("All spell slots restored.");
        }

        if (restoreReagents) {
            messages.push("Infused Reagents restored.");
        }

        if (temporaryItems.length) {
            messages.push("Temporary items removed.");
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
        return ChatMessage.create({
            user: game.user.id,
            content: messages.join(" "),
            speaker: { alias: actorName },
        });
    }
}
