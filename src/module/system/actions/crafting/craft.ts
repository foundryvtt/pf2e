import { ActionsPF2e, SkillActionOptions } from "@system/actions/actions";
import { PhysicalItemPF2e } from "@item";
import { calculateDC } from "@module/dc";
import { CheckDC } from "@system/check-degree-of-success";

interface CraftActionOptions extends SkillActionOptions {
    dc?: CheckDC;
    item?: PhysicalItemPF2e;
    uuid?: string;
}

export async function craft(options: CraftActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "crafting");

    // resolve item
    const item = await (async () => {
        return options.item ?? (options.uuid ? fromUuid(options.uuid) : null) ?? null; // show dialog to support drag and drop items
    })();

    // ensure item is a valid crafting target
    if (!item) {
        ui.notifications.warn(
            game.i18n.format("PF2E.Actions.Craft.Warning.MissingItem", { uuid: options.uuid ?? null })
        );
        return;
    } else if (!(item instanceof PhysicalItemPF2e)) {
        ui.notifications.warn(game.i18n.format("PF2E.Actions.Craft.Warning.NotPhysicalItem", { item: item.name }));
        return;
    }

    // check for sufficient proficiency in crafting skill
    // check that actor has the necessary feats to craft item

    // figure out DC from item
    const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
    const dc: CheckDC = options.dc ?? {
        value: calculateDC(item.level, { proficiencyWithoutLevel }),
    };

    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Craft.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:craft"],
        extraOptions: ["action:craft"],
        traits: ["downtime", "manipulate"],
        checkType,
        event: options.event,
        difficultyClass: dc,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Craft", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Craft", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Craft", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.Craft", "criticalFailure"),
        ],
        callback: (_result) => {
            // react to check result, creating the item in the actor's inventory on a success
        },
    });
}
