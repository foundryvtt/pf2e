import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { StrikeData } from "@actor/data/base.ts";
import { StatisticModifier } from "@actor/modifiers.ts";
import { CheckContext, CheckContextData, CheckContextError, CheckContextOptions } from "@system/action-macros/types.ts";
import { SingleCheckAction, SingleCheckActionVariant, SingleCheckActionVariantData } from "@actor/actions/index.ts";
import { ItemPF2e } from "@item";

const toHighestModifier = (highest: StatisticModifier | null, current: StatisticModifier): StatisticModifier | null => {
    return current.totalModifier > (highest?.totalModifier ?? 0) ? current : highest;
};

function unarmedStrikeWithHighestModifier<ItemType extends ItemPF2e<ActorPF2e>>(
    opts: CheckContextOptions<ItemType>,
    data: CheckContextData<ItemType>
) {
    const actionRollOptions = ["action:escape", "action:escape:unarmed"];
    const { actor, rollOptions } = opts.buildContext({
        actor: opts.actor,
        rollOptions: {
            contextual: ["attack-roll", ...actionRollOptions],
            generic: actionRollOptions,
        },
        target: opts.target,
    });
    const strikes = (() => {
        if (actor instanceof CharacterPF2e) {
            return actor.system.actions.filter((strike) =>
                strike.weaponTraits.map((trait) => trait.name).includes("unarmed")
            );
        } else if (actor instanceof NPCPF2e) {
            return actor.system.actions.filter((strike) =>
                strike.traits.map((trait) => trait.name).includes("unarmed")
            );
        }
        return [] as StrikeData[];
    })();
    const statistic = strikes
        .map((strike) => {
            const modifiers = (strike.modifiers ?? []).concat(data.modifiers ?? []);
            return new StatisticModifier("unarmed", modifiers, rollOptions);
        })
        .reduce(toHighestModifier, null);
    return statistic ? { actor, rollOptions, statistic } : null;
}

function escapeCheckContext<ItemType extends ItemPF2e<ActorPF2e>>(
    opts: CheckContextOptions<ItemType>,
    data: CheckContextData<ItemType>
): CheckContext<ItemType> | undefined {
    // find all unarmed strikes and pick the one with the highest modifier
    const unarmed = data.slug && data.slug !== "unarmed" ? null : unarmedStrikeWithHighestModifier(opts, data);

    // filter out any unarmed variants, as those are handled above
    const candidates = data.slug ? [data.slug] : ["acrobatics", "athletics"];
    const alternatives = candidates
        .filter((slug) => slug !== "unarmed")
        .map((slug) => {
            const actionRollOptions = ["action:escape", `action:escape:${slug}`];
            const { checkType, property } = ActionMacroHelpers.resolveStat(slug);
            const { actor, rollOptions } = opts.buildContext({
                actor: opts.actor,
                rollOptions: {
                    contextual: [checkType, ...actionRollOptions],
                    generic: actionRollOptions,
                },
                target: opts.target,
            });
            const statistic = getProperty(opts.actor, property) as StatisticModifier & { rank?: number };
            return {
                actor,
                rollOptions,
                statistic: new StatisticModifier(
                    statistic.slug,
                    statistic.modifiers.concat(data.modifiers ?? []),
                    rollOptions
                ),
            };
        });

    // find the highest modifier of unarmed, acrobatics, and athletics
    const highest = alternatives.reduce(
        (highest, current) =>
            !highest || current.statistic.totalModifier > (highest?.statistic.totalModifier ?? 0) ? current : highest,
        unarmed
    );

    if (highest) {
        const { checkType, stat: slug, subtitle } = ActionMacroHelpers.resolveStat(highest.statistic.slug);
        return {
            actor: highest.actor,
            modifiers: data.modifiers,
            rollOptions: highest.rollOptions,
            slug,
            statistic: highest.statistic,
            subtitle,
            type: checkType,
        };
    }
    throw new CheckContextError("No applicable statistic to roll for Escape check.", opts.actor, "null");
}

function escape(options: SkillActionOptions): void {
    const slug = options?.skill ?? "";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:escape"];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        checkContext: (opts) => escapeCheckContext(opts, { modifiers, rollOptions, slug }),
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Escape.Title",
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.skills.athletics,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Escape", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Escape", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Escape", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class EscapeActionVariant extends SingleCheckActionVariant {
    override get statistic(): string {
        return ""; // default to the highest modifier, instead of just unarmed
    }

    protected override checkContext<ItemType extends ItemPF2e<ActorPF2e>>(
        opts: CheckContextOptions<ItemType>,
        data: CheckContextData<ItemType>
    ): CheckContext<ItemType> | undefined {
        return escapeCheckContext(opts, data);
    }
}

class EscapeAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: "PF2E.Actions.Escape.Description",
            difficultyClass: "skills.athletics",
            name: "PF2E.Actions.Escape.Title",
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.Actions.Escape.Notes.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.Actions.Escape.Notes.success" },
                { outcome: ["criticalFailure"], text: "PF2E.Actions.Escape.Notes.criticalFailure" },
            ],
            rollOptions: ["action:escape"],
            slug: "escape",
            statistic: "unarmed",
            traits: ["attack"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): EscapeActionVariant {
        return new EscapeActionVariant(this, data);
    }
}

const action = new EscapeAction();

export { escape as legacy, action };
