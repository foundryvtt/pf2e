import { ActorPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { WeaponPF2e } from "@item";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import {
    CheckContext,
    CheckContextData,
    CheckContextOptions,
    CheckResultCallback,
    CombatManeuverActionUseOptions,
} from "@system/action-macros/types.ts";
import {
    SingleCheckAction,
    SingleCheckActionUseOptions,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
} from "@actor/actions/index.ts";

type TripActionUseOptions = SingleCheckActionUseOptions & CombatManeuverActionUseOptions;

function tripCheckContext(
    opts: CheckContextOptions<Partial<CombatManeuverActionUseOptions>>,
    data: CheckContextData,
): CheckContext | undefined {
    // weapon
    const item = ActionMacroHelpers.resolveWieldedWeapon(opts.actor, opts.passthrough?.item, ["trip", "ranged-trip"]);

    // context
    const context = ActionMacroHelpers.defaultCheckContext(opts, {
        item,
        modifiers: data.modifiers,
        rollOptions: data.rollOptions,
        slug: data.slug,
    });

    // modifiers
    if (item && context) {
        const modifiers = context.modifiers?.length ? [...context.modifiers] : [];
        const modifier = ActionMacroHelpers.getWeaponPotencyModifier(item, data.slug);
        if (modifier) {
            modifiers.push(modifier);
        }
        if (item.traits.has("ranged-trip")) {
            modifiers.push(
                new ModifierPF2e({
                    slug: "ranged-trip",
                    adjustments: extractModifierAdjustments(
                        opts.actor.synthetics.modifierAdjustments,
                        context.rollOptions,
                        "ranged-trip",
                    ),
                    type: "circumstance",
                    label: CONFIG.PF2E.weaponTraits["ranged-trip"],
                    modifier: -2,
                }),
            );
        }
        context.modifiers = modifiers;
    }

    return context;
}

function trip(options: SkillActionOptions & Partial<CombatManeuverActionUseOptions>): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:trip"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>, Partial<CombatManeuverActionUseOptions>>({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Trip.Title",
        checkContext: (opts) => tripCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "reflex",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "criticalFailure"),
        ],
        passthrough: options,
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class TripActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<TripActionUseOptions> = {}): Promise<CheckResultCallback[]> {
        return super.use(options);
    }

    protected override checkContext(
        opts: CheckContextOptions<Partial<TripActionUseOptions>>,
        data: CheckContextData,
    ): CheckContext | undefined {
        return tripCheckContext(opts, data);
    }
}

class TripAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: "PF2E.Actions.Trip.Description",
            difficultyClass: "reflex",
            name: "PF2E.Actions.Trip.Title",
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.Actions.Trip.Notes.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.Actions.Trip.Notes.success" },
                { outcome: ["criticalFailure"], text: "PF2E.Actions.Trip.Notes.criticalFailure" },
            ],
            rollOptions: ["action:trip"],
            section: "skill",
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
