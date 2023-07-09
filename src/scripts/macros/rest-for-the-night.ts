import { CharacterAttributes, CharacterResources } from "@actor/character/data.ts";
import { ActorPF2e, CharacterPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { ChatMessageSourcePF2e } from "@module/chat-message/data.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { ActionDefaultOptions } from "@system/action-macros/index.ts";
import { localizer, tupleHasValue } from "@util";
import { Duration } from "luxon";

interface RestForTheNightOptions extends ActionDefaultOptions {
    skipDialog?: boolean;
}

/** A macro for the Rest for the Night quasi-action */
export async function restForTheNight(options: RestForTheNightOptions): Promise<ChatMessagePF2e[]> {
    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const characters = actors.filter((a): a is CharacterPF2e => a?.type === "character");
    if (actors.length === 0) {
        ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.NoPCTokenSelected"));
        return [];
    }
    const localize = localizer("PF2E.Action.RestForTheNight");
    const promptMessage = ((): string => {
        const element = document.createElement("p");
        element.innerText = localize("Prompt");
        return element.outerHTML;
    })();
    if (
        !options.skipDialog &&
        !(await Dialog.confirm({
            title: localize("Label"),
            content: promptMessage,
            defaultYes: true,
        }))
    ) {
        return [];
    }

    const messages: PreCreate<ChatMessageSourcePF2e>[] = [];

    for (const actor of characters) {
        const actorUpdates: ActorUpdates = { attributes: {}, resources: {} };
        const itemUpdates: EmbeddedDocumentUpdateData<ItemPF2e<ActorPF2e>>[] = [];
        // A list of messages informing the user of updates made due to rest
        const statements: string[] = [];

        const { abilities, attributes, hitPoints, level } = actor;

        // Hit points
        const conModifier = abilities.con.mod;
        const maxRestored = Math.max(conModifier, 1) * level * hitPoints.recoveryMultiplier + hitPoints.recoveryAddend;
        const hpLost = attributes.hp.max - attributes.hp.value;
        const hpRestored = hpLost >= maxRestored ? maxRestored : hpLost;
        if (hpRestored > 0) {
            const singularOrPlural =
                hpRestored === 1
                    ? "PF2E.Action.RestForTheNight.Message.HitPointsSingle"
                    : "PF2E.Action.RestForTheNight.Message.HitPoints";
            actorUpdates.attributes.hp = { value: (attributes.hp.value += hpRestored) };
            statements.push(game.i18n.format(singularOrPlural, { hitPoints: hpRestored }));
        }

        // Conditions
        const RECOVERABLE_CONDITIONS = ["doomed", "drained", "fatigued", "wounded"] as const;
        const conditionChanges: Record<(typeof RECOVERABLE_CONDITIONS)[number], "removed" | "reduced" | null> = {
            doomed: null,
            drained: null,
            fatigued: null,
            wounded: null,
        };

        // Fatigued condition
        if (actor.hasCondition("fatigued")) {
            await actor.decreaseCondition("fatigued");
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
        const wands = items.consumable.filter((i) => i.category === "wand" && i.uses.value < i.uses.max);
        itemUpdates.push(...wands.map((wand) => ({ _id: wand.id, "system.charges.value": wand.uses.max })));
        const wandRecharged = itemUpdates.length > 0;

        // Restore reagents
        const resources = actor.system.resources;
        const reagents = resources.crafting.infusedReagents;
        if (reagents && reagents.value < reagents.max) {
            actorUpdates.resources.crafting = { infusedReagents: { value: reagents.max } };
            statements.push(localize("Message.InfusedReagents"));
        }

        // Spellcasting entries and focus points
        const spellcastingRecharge = actor.spellcasting.recharge();
        itemUpdates.push(...spellcastingRecharge.itemUpdates);
        if (spellcastingRecharge.actorUpdates?.["system.resources.focus.value"]) {
            actorUpdates.resources.focus = {
                value: spellcastingRecharge.actorUpdates?.["system.resources.focus.value"],
            };
        }

        // Action Frequencies
        const actionsAndFeats = [...actor.itemTypes.action, ...actor.itemTypes.feat];
        const withFrequency = actionsAndFeats.filter(
            (a) =>
                a.frequency &&
                (tupleHasValue(["turn", "round", "day"], a.frequency.per) ||
                    Duration.fromISO(a.frequency.per) <= Duration.fromISO("PT8H")) &&
                a.frequency.value < a.frequency.max
        );
        if (withFrequency.length) {
            statements.push(localize("Message.Frequencies"));
            itemUpdates.push(...withFrequency.map((a) => ({ _id: a.id, "system.frequency.value": a.frequency!.max })));
        }

        // Stamina points
        const staminaEnabled = !!game.settings.get("pf2e", "staminaVariant");
        const stamina = attributes.sp;
        const resolve = attributes.resolve;

        if (staminaEnabled) {
            if (stamina.value < stamina.max) {
                actorUpdates.attributes.sp = { value: stamina.max };
                statements.push(localize("Message.StaminaPoints"));
            }
            if (resolve.value < resolve.max) {
                actorUpdates.attributes.resolve = { value: resolve.max };
                statements.push(localize("Message.Resolve"));
            }
        }

        // Collect temporary crafted items to remove
        const temporaryItems = actor.inventory.filter((i) => i.isTemporary).map((i) => i.id);

        const hasActorUpdates = Object.keys({ ...actorUpdates.attributes, ...actorUpdates.resources }).length > 0;
        const hasItemUpdates = itemUpdates.length > 0;
        const removeTempItems = temporaryItems.length > 0;

        // Updated actor with the sweet fruits of rest
        if (hasActorUpdates) {
            await actor.update({ system: actorUpdates }, { render: false });
        }

        if (hasItemUpdates) {
            await actor.updateEmbeddedDocuments("Item", itemUpdates, { render: false });
        }

        if (removeTempItems) {
            await actor.deleteEmbeddedDocuments("Item", temporaryItems, { render: false });
            statements.push(localize("Message.TemporaryItems"));
        }

        if (spellcastingRecharge.actorUpdates) {
            statements.push(localize("Message.FocusPoints"));
        }

        if (spellcastingRecharge.itemUpdates.length > 0) {
            statements.push(localize("Message.SpellSlots"));
        }

        // Wand recharge
        if (wandRecharged) {
            statements.push(localize("Message.WandsCharges"));
        }

        // Conditions removed
        const reducedConditions = RECOVERABLE_CONDITIONS.filter((c) => conditionChanges[c] === "reduced");
        for (const slug of reducedConditions) {
            const { name } = game.pf2e.ConditionManager.getCondition(slug);
            statements.push(localize("Message.ConditionReduced", { condition: name }));
        }

        // Condition value reduction
        const removedConditions = RECOVERABLE_CONDITIONS.filter((c) => conditionChanges[c] === "removed");
        for (const slug of removedConditions) {
            const { name } = game.pf2e.ConditionManager.getCondition(slug);
            statements.push(localize("Message.ConditionRemoved", { condition: name }));
        }

        // Send chat message with results
        const actorAwakens = localize("Message.Awakens", { actor: actor.name });
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

        // Re-render the actor's sheet after all writes have completed
        await actor.sheet.render();

        // Call a hook for modules to do anything extra
        Hooks.callAll("pf2e.restForTheNight", actor);
    }

    return ChatMessagePF2e.createDocuments(messages);
}

interface ActorUpdates {
    attributes: DeepPartial<CharacterAttributes>;
    resources: DeepPartial<CharacterResources>;
}
