import { CharacterPF2e } from "@actor";
import { CharacterAttributesSource, CharacterResourcesSource } from "@actor/character/data.ts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ChatMessageSourcePF2e } from "@module/chat-message/data.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { ActionDefaultOptions } from "@system/action-macros/index.ts";
import { localizer } from "@util";

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
        const actorUpdates: ActorUpdates = {
            attributes: { hp: { value: actor._source.system.attributes.hp.value } },
            resources: {},
        };
        const itemCreates: PreCreate<ItemSourcePF2e>[] = [];
        const itemUpdates: EmbeddedDocumentUpdateData[] = [];
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
        itemUpdates.push(...wands.map((wand) => ({ _id: wand.id, "system.uses.value": wand.uses.max })));
        const wandRecharged = itemUpdates.length > 0;

        // Restore reagents
        const resources = actor.system.resources;
        const reagents = resources.crafting.infusedReagents;
        if (reagents && reagents.value < reagents.max) {
            actorUpdates.resources.crafting = { infusedReagents: { value: reagents.max } };
            statements.push(localize("Message.InfusedReagents"));
        }

        // Perform all built in actor recharges, such as spellcasting and frequencies
        const recharges = await actor.recharge({ duration: "day", commit: false });
        if (recharges.actorUpdates?.system?.resources) {
            actorUpdates.resources = fu.mergeObject(actorUpdates.resources, recharges.actorUpdates.system.resources);
        }
        itemUpdates.push(...recharges.itemUpdates);

        // Stamina points
        if (game.pf2e.settings.variants.stamina) {
            const stamina = attributes.hp.sp ?? { value: 0, max: 0 };
            const resolve = resources.resolve ?? { value: 0, max: 0 };
            if (stamina.value < stamina.max) {
                actorUpdates.attributes.hp.sp = { value: stamina.max };
                statements.push(localize("Message.StaminaPoints"));
            }
            if (resolve.value < resolve.max) {
                actorUpdates.resources.resolve = { value: resolve.max };
                statements.push(localize("Message.Resolve"));
            }
        }

        // Collect temporary crafted items to remove. Skip those that are a special resource
        const specialResourceItems = Object.values(actor.synthetics.resources)
            .map((r) => r.itemUUID)
            .filter((i) => !!i);
        const temporaryItems = actor.inventory
            .filter((i) => i.isTemporary && (!i.sourceId || !specialResourceItems.includes(i.sourceId)))
            .map((i) => i.id);
        const removeTempItems = temporaryItems.length > 0;

        // Updated actor with the sweet fruits of rest
        const hasActorUpdates = Object.keys({ ...actorUpdates.attributes, ...actorUpdates.resources }).length > 0;
        if (hasActorUpdates) {
            await actor.update({ system: actorUpdates }, { render: false });
        }

        if (itemCreates.length > 0) {
            await actor.createEmbeddedDocuments("Item", itemCreates, { render: false });
        }

        if (itemUpdates.length > 0) {
            await actor.updateEmbeddedDocuments("Item", itemUpdates, { render: false });
        }

        if (removeTempItems) {
            await actor.deleteEmbeddedDocuments("Item", temporaryItems, { render: false });
            statements.push(localize("Message.TemporaryItems"));
        }

        if (recharges.affected.frequencies) {
            statements.push(localize("Message.Frequencies"));
        }

        for (const resource of recharges.affected.resources) {
            if (resource === "focus") {
                statements.push(localize("Message.FocusPoints"));
            } else if (resource in actor.synthetics.resources) {
                const name = actor.synthetics.resources[resource].label;
                statements.push(localize("Message.Resource", { name }));
            }
        }

        if (recharges.affected.spellSlots) {
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
            }),
        );
        const content = [actorAwakens, recoveryList.outerHTML].join("\n");

        // Call a hook for modules to do anything extra
        Hooks.callAll("pf2e.restForTheNight", actor);
        messages.push({ author: game.user.id, content, speaker: ChatMessagePF2e.getSpeaker({ actor }) });
    }

    return ChatMessagePF2e.createDocuments(messages, { restForTheNight: true });
}

interface ActorUpdates {
    attributes: DeepPartial<CharacterAttributesSource> & { hp: { value: number } };
    resources: DeepPartial<CharacterResourcesSource>;
}
