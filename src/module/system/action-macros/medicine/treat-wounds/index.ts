import { ActorPF2e, CreaturePF2e } from "@actor";
import { TREAT_WOUNDS_TIERS, TreatWoundsTier } from "./types.ts";
import { TreatWoundsDialog } from "./dialog.ts";
import { applyStackingRules, ModifierPF2e } from "@actor/modifiers.ts";
import { DamagePF2e } from "@system/damage/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import {
    SingleCheckAction,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
    SingleCheckActionUseOptions,
} from "@actor/actions/index.ts";
import { CheckResultCallback } from "@system/action-macros/types.ts";
import { CheckDC } from "@system/degree-of-success.ts";

function isCreature(actor?: ActorPF2e | null): actor is CreaturePF2e {
    return actor?.isOfType("creature") ?? false;
}

function isModifier(value?: ModifierPF2e | null): value is ModifierPF2e {
    return value instanceof ModifierPF2e;
}

function formula(base: number | string, modifier: number) {
    if (typeof base === "number") {
        return `${base + modifier}[healing]`;
    } else if (modifier) {
        return `${base}${modifier < 0 ? modifier : "+" + modifier}[healing]`;
    }
    return `${base}[healing]`;
}

interface TreatWoundsActionUseOptions
    extends Omit<SingleCheckActionUseOptions, "actors" | "difficultyClass" | "variant"> {
    actor: CreaturePF2e;
    difficultyClass: CheckDC;
    rollOptions: string[];
    strict: boolean;
    tier: TreatWoundsTier;
}

class TreatWoundsActionVariant extends SingleCheckActionVariant {
    constructor(action: TreatWoundsAction, data?: SingleCheckActionVariantData) {
        super(action, data);
    }

    override async use(options?: Partial<TreatWoundsActionUseOptions>): Promise<CheckResultCallback[]> {
        const actor = [options?.actor, canvas.tokens.controlled.map((token) => token.actor), game.user.character]
            .flat()
            .find(isCreature);
        if (!actor) {
            const reason = game.i18n.localize("PF2E.Actions.TreatWounds.Warning.NoActor");
            return Promise.reject(reason);
        }

        const context = await TreatWoundsDialog.getContext(actor, {
            difficultyClass: options?.difficultyClass?.value,
            rollOptions: options?.rollOptions ?? [],
            skill: typeof options?.statistic === "string" ? options.statistic : "medicine",
            strict: options?.strict ?? true,
        });
        if (!context) {
            return Promise.reject(); // user clicked the cancel button or closed the dialog
        }
        const { difficultyClass, rollOptions, skill: statistic, tier } = context;
        const traits = !!options?.traits && Array.isArray(options.traits) ? [...options.traits] : [];

        // replace these with proper rule element support
        const riskySurgery = !!actor.itemTypes.feat.find((feat) => feat.slug === "risky-surgery");
        const magicHands = !!actor.itemTypes.feat.find((feat) => feat.slug === "magic-hands");
        if (magicHands) {
            traits.unshift("divine");
        }

        const notes = options?.notes && Array.isArray(options.notes) ? options.notes : [];
        if (TREAT_WOUNDS_TIERS[tier].healing) {
            notes.push({
                title: game.i18n.localize(`PF2E.ProficiencyRank.${tier}`),
                text: game.i18n.format("PF2E.Actions.TreatWounds.Notes.HitPointsRegainedIncrease", {
                    healing: TREAT_WOUNDS_TIERS[tier].healing,
                }),
                outcome: ["success", "criticalSuccess"],
            });
        }

        const results = await super.use({
            ...options,
            actor,
            difficultyClass,
            notes,
            rollOptions,
            statistic,
            traits,
        });

        if (results.length && riskySurgery && rollOptions.includes("risky-surgery")) {
            const flavor = game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.RiskySurgery");
            const speaker = ChatMessage.getSpeaker({ actor });
            await new DamageRoll("1d8[slashing]").toMessage({ flavor, speaker });
        }

        for (const result of results) {
            if (result.outcome === "criticalFailure") {
                const flavor = game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.CriticalFailure");
                const speaker = ChatMessage.getSpeaker({ actor: result.actor });
                await new DamageRoll("1d8").toMessage({ flavor, speaker });
            } else if (result.outcome && ["criticalSuccess", "success"].includes(result.outcome)) {
                const critical = result.outcome === "criticalSuccess";
                const modifiers = (actor.synthetics.modifiers["treat-wounds-healing"] ?? [])
                    .map((deferred) => deferred())
                    .filter(isModifier)
                    .filter((modifier) => !!modifier.modifier)
                    .filter((modifier) => modifier.critical === null || modifier.critical === critical)
                    .filter((modifier) => modifier.predicate.test(rollOptions));
                modifiers.unshift(
                    new ModifierPF2e({
                        label: game.i18n.localize(`PF2E.ProficiencyRank.${tier}`),
                        modifier: TREAT_WOUNDS_TIERS[tier].healing,
                        slug: `treat-wounds-${tier}`,
                    })
                );
                const modifier = applyStackingRules(modifiers ?? []);
                const breakdown = modifiers
                    .filter((modifier) => modifier.enabled)
                    .map((modifier) => `${modifier.label} ${modifier.modifier < 0 ? "" : "+"}${modifier.modifier}`);

                const healing = ((): { formula: string; breakdown: string[] } | null => {
                    switch (result.outcome) {
                        case "criticalSuccess": {
                            return {
                                formula: formula(magicHands ? 32 : "4d8", modifier),
                                breakdown: [magicHands ? "Magic Hands 32 Healing" : "4d8 Healing"].concat(breakdown),
                            };
                        }
                        case "success": {
                            return {
                                formula: formula(magicHands ? 16 : "2d8", modifier),
                                breakdown: [magicHands ? "Magic Hands 16 Healing" : "2d8 Healing"].concat(breakdown),
                            };
                        }
                        default: {
                            return null;
                        }
                    }
                })();
                if (!healing) {
                    continue;
                }
                await DamagePF2e.roll(
                    {
                        name: game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.Success"),
                        traits,
                        materials: [],
                        modifiers: [],
                        damage: {
                            roll: new DamageRoll(healing.formula),
                            breakdown: healing.breakdown,
                        },
                    },
                    {
                        options: new Set<string>(rollOptions),
                        outcome: result.outcome,
                        self: { actor, token: null, item: null, statistic: null, modifiers: [] },
                        sourceType: "check",
                        type: "damage-roll",
                    }
                );
            }
        }

        return results;
    }
}

class TreatWoundsAction extends SingleCheckAction {
    constructor() {
        super({
            description: "PF2E.Actions.TreatWounds.Description",
            name: "PF2E.Actions.TreatWounds.Title",
            notes: [
                {
                    outcome: ["criticalSuccess"],
                    text: "PF2E.Actions.TreatWounds.Notes.criticalSuccess",
                    title: "PF2E.Check.Result.Degree.Check.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    text: "PF2E.Actions.TreatWounds.Notes.success",
                    title: "PF2E.Check.Result.Degree.Check.success",
                },
                {
                    outcome: ["criticalFailure"],
                    text: "PF2E.Actions.TreatWounds.Notes.criticalFailure",
                    title: "PF2E.Check.Result.Degree.Check.criticalFailure",
                },
            ],
            rollOptions: ["action:treat-wounds"],
            slug: "treat-wounds",
            statistic: "medicine",
            traits: ["exploration", "healing", "manipulate"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new TreatWoundsActionVariant(this, data);
    }
}

const action = new TreatWoundsAction();

export { action };
