import { ActorPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction, SingleCheckActionVariant, SingleCheckActionVariantData } from "@actor/actions/index.ts";
import { CheckContext, CheckContextData, CheckContextOptions } from "@system/action-macros/types.ts";

function tripCheckContext<ItemType extends ItemPF2e<ActorPF2e>>(
    opts: CheckContextOptions<ItemType>,
    data: CheckContextData<ItemType>
): CheckContext<ItemType> | undefined {
    // weapon
    const item = [
        ...(ActionMacroHelpers.getApplicableEquippedWeapons(opts.actor, "trip") ?? []),
        ...(ActionMacroHelpers.getApplicableEquippedWeapons(opts.actor, "ranged-trip") ?? []),
    ].shift();

    // context
    const context = ActionMacroHelpers.defaultCheckContext(opts, {
        item: data.item,
        modifiers: data.modifiers,
        rollOptions: data.rollOptions,
        slug: data.slug,
    });

    // modifiers
    if (item && context) {
        const modifiers = context.modifiers?.length ? [...context.modifiers] : [];
        if (item.traits.has("trip") || item.traits.has("ranged-trip")) {
            const modifier = ActionMacroHelpers.getWeaponPotencyModifier(item, data.slug);
            if (modifier) {
                modifiers.push(modifier);
            }
        }
        if (item.traits.has("ranged-trip")) {
            modifiers.push(
                new ModifierPF2e({
                    slug: "ranged-trip",
                    adjustments: extractModifierAdjustments(
                        opts.actor.synthetics.modifierAdjustments,
                        context.rollOptions,
                        "ranged-trip"
                    ),
                    type: "circumstance",
                    label: CONFIG.PF2E.weaponTraits["ranged-trip"],
                    modifier: -2,
                })
            );
        }
        context.modifiers = modifiers;
    }

    return context;
}

function trip(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:trip"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>>({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Trip.Title",
        checkContext: (opts) => tripCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class TripActionVariant extends SingleCheckActionVariant {
    protected override checkContext<ItemType extends ItemPF2e<ActorPF2e>>(
        opts: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>
    ): CheckContext<ItemType> | undefined {
        return tripCheckContext(opts, data);
    }
}

class TripAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: "PF2E.Actions.Trip.Description",
            difficultyClass: "saves.reflex",
            name: "PF2E.Actions.Trip.Title",
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.Actions.Trip.Notes.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.Actions.Trip.Notes.success" },
                { outcome: ["criticalFailure"], text: "PF2E.Actions.Trip.Notes.criticalFailure" },
            ],
            rollOptions: ["action:trip"],
            slug: "trip",
            statistic: "athletics",
            traits: ["attack"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): TripActionVariant {
        return new TripActionVariant(this, data);
    }
}

const action = new TripAction();

export { trip as legacy, action };
