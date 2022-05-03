import { CharacterPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message";
import { ItemPF2e } from "@item";
import { ActionDefaultOptions } from "@system/action-macros";
import { LocalizePF2e } from "@system/localize";
import { ChatMessageSourcePF2e } from "@module/chat-message/data";

/** A macro for the Rest for the Night quasi-action */
export async function restForTheNight(options: ActionDefaultOptions): Promise<ChatMessagePF2e[]> {
    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const characters = actors.filter((actor): actor is CharacterPF2e => actor?.data.type === "character");
    if (actors.length === 0) {
        ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.NoPCTokenSelected"));
        return [];
    }
    const translations = LocalizePF2e.translations.PF2E.Action.RestForTheNight;

    const promptMessage = ((): string => {
        const element = document.createElement("p");
        element.innerText = translations.Prompt;
        return element.outerHTML;
    })();
    if (!(await Dialog.confirm({ title: translations.Label, content: promptMessage, defaultYes: true }))) {
        return [];
    }

    const messages: PreCreate<ChatMessageSourcePF2e>[] = [];

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
        const RECOVERABLE_CONDITIONS = ["doomed", "drained", "fatigued", "wounded"] as const;
        const conditionChanges: Record<typeof RECOVERABLE_CONDITIONS[number], "removed" | "reduced" | null> = {
            doomed: null,
            drained: null,
            fatigued: null,
            wounded: null,
        };

        // Fatigued condition
        if (actor.hasCondition("fatigued")) {
            actor.decreaseCondition("fatigued");
            conditionChanges.fatigued = "removed";
        }

        // Doomed and Drained conditions
        for (const slug of ["doomed", "drained"] as const) {
            const condition = actor.getCondition(slug);
            if (!condition) continue;

            const newValue = (condition.value ?? 1) - 1;
            await actor.decreaseCondition(slug);
            conditionChanges[slug] = newValue === 0 ? "removed" : "reduced";
        }

        if (actor.hasCondition("wounded") && attributes.hp.value === attributes.hp.max) {
            await actor.decreaseCondition("wounded", { forceRemove: true });
            conditionChanges.wounded = "removed";
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
        const restoreReagents = reagents && reagents.value < reagents.max;
        if (restoreReagents) reagents.value = reagents.max;

        // Construct messages
        const statements: string[] = [];

        // Spellcasting entries and focus points
        const spellcastingRecharge = actor.spellcasting.recharge();
        updateData.push(...spellcastingRecharge.itemUpdates);

        // Stamina points
        const staminaEnabled = !!game.settings.get("pf2e", "staminaVariant");
        const stamina = attributes.sp;
        const resolve = attributes.resolve;
        const prerest = { stamina: stamina.value, resolve: resolve.value };

        if (staminaEnabled) {
            if (stamina.value < stamina.max) {
                stamina.value = stamina.max;
                statements.push(game.i18n.localize(translations.Message.StaminaPoints));
            }
            if (resolve.value < resolve.max) {
                resolve.value = resolve.max;
                statements.push(game.i18n.localize(translations.Message.Resolve));
            }
        }

        // Updated actor with the sweet fruits of rest
        if (
            hpRestored > 0 ||
            stamina.value > prerest.stamina ||
            resolve.value > prerest.resolve ||
            spellcastingRecharge.actorUpdates
        ) {
            actor.update({ "data.attributes": attributes, ...spellcastingRecharge.actorUpdates });
        }
        if (updateData.length > 0) {
            actor.updateEmbeddedDocuments("Item", updateData);
        }

        // Remove temporary crafted items
        const temporaryItems = actor.physicalItems.filter((i) => i.isTemporary).map((i) => i.id);
        if (temporaryItems.length > 0) await ItemPF2e.deleteDocuments(temporaryItems);

        // Hit-point restoration
        if (hpRestored > 0) {
            statements.push(game.i18n.format(translations.Message.HitPoints, { hitPoints: hpRestored }));
        }

        if (spellcastingRecharge.actorUpdates) {
            statements.push(game.i18n.localize(translations.Message.FocusPoints));
        }

        if (spellcastingRecharge.itemUpdates.length) {
            statements.push(game.i18n.localize(translations.Message.SpellSlots));
        }

        if (restoreReagents) {
            statements.push(game.i18n.localize(translations.Message.InfusedReagents));
        }

        // Wand recharge
        if (wandRecharged) {
            statements.push(game.i18n.localize(translations.Message.WandsCharges));
        }

        if (temporaryItems.length) {
            statements.push(game.i18n.localize(translations.Message.TemporaryItems));
        }

        // Conditions removed
        const reducedConditions = RECOVERABLE_CONDITIONS.filter((c) => conditionChanges[c] === "reduced");
        for (const slug of reducedConditions) {
            const { name } = game.pf2e.ConditionManager.getCondition(slug);
            statements.push(game.i18n.format(translations.Message.ConditionReduced, { condition: name }));
        }

        // Condition value reduction
        const removedConditions = RECOVERABLE_CONDITIONS.filter((c) => conditionChanges[c] === "removed");
        for (const slug of removedConditions) {
            const { name } = game.pf2e.ConditionManager.getCondition(slug);
            statements.push(game.i18n.format(translations.Message.ConditionRemoved, { condition: name }));
        }

        // Send chat message with results
        const actorAwakens = game.i18n.format(translations.Message.Awakens, { actor: actor.name });
        const recoveryList = document.createElement("ul");
        recoveryList.append(
            ...statements.map((statement): HTMLLIElement => {
                const listItem = document.createElement("li");
                listItem.innerText = statement;
                return listItem;
            })
        );
        const content = [actorAwakens, recoveryList.outerHTML].join("\n");

        messages.push({ user: game.user.id, content, speaker: { alias: actor.name } });
    }

    return ChatMessagePF2e.createDocuments(messages);
}
