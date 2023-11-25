import { ItemSourcePF2e, ItemType } from "@item/base/data/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { ActorPF2e, HitPointsSummary } from "../base.ts";
import { ArmySource, ArmySystemData } from "./data.ts";
import { ArmorStatistic, Statistic, StatisticDifficultyClass } from "@system/statistic/index.ts";
import { ARMY_STATS, ARMY_TYPES } from "./values.ts";
import { signedInteger, tupleHasValue } from "@util";
import { Kingdom } from "@actor/party/kingdom/model.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import * as R from "remeda";
import { ActorInitiative } from "@actor/initiative.ts";
import { ArmyStrike } from "./types.ts";
import { AttackRollParams } from "@system/rolls.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";

class ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    declare armorClass: StatisticDifficultyClass<ArmorStatistic>;
    declare scouting: Statistic;
    declare maneuver: Statistic;
    declare morale: Statistic;

    declare strikes: {
        melee: ArmyStrike;
        ranged: ArmyStrike;
    };

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return ["campaignFeature", "effect"];
    }

    get routed(): boolean {
        return this.hitPoints.value < this.system.attributes.hp.routThreshold;
    }

    /** Gets the active kingdom. Later this should be configurable */
    get kingdom(): Kingdom | null {
        const campaign = game.actors.party?.campaign;
        return campaign instanceof Kingdom ? campaign : null;
    }

    get maxTactics(): number {
        return ARMY_STATS.maxTactics[this.level];
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Set certain properties to their default values if omitted
        this.system.ac.value ??= this._source.system.ac.value ??= ARMY_STATS.ac[this.level];
        this.system.scouting ??= this._source.system.scouting ??= ARMY_STATS.scouting[this.level];

        this.system.details.level.value = Math.clamped(this.system.details.level.value, 1, 20);
        this.system.resources.potions.max = 3;
        this.system.saves.strongSave = this.system.saves.maneuver >= this.system.saves.morale ? "maneuver" : "morale";
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const expectedAC = ARMY_STATS.ac[this.level];
        const acAdjustment = this.system.ac.value - expectedAC;
        this.armorClass = new ArmorStatistic(this, {
            modifiers: R.compact([
                new ModifierPF2e({
                    slug: "base",
                    label: "PF2E.Kingmaker.Army.Base",
                    modifier: expectedAC - 10,
                }),
                acAdjustment &&
                    new ModifierPF2e({
                        slug: "adjustment",
                        label: "PF2E.Kingmaker.Army.Adjustment",
                        modifier: acAdjustment,
                    }),
            ]),
        }).dc;

        const baseScouting = ARMY_STATS.scouting[this.level];
        const scoutAdjustment = this.system.scouting - baseScouting;
        this.scouting = new Statistic(this, {
            slug: "scouting",
            label: "PF2E.Kingmaker.Army.Scouting",
            modifiers: R.compact([
                new ModifierPF2e({ slug: "base", label: "PF2E.Kingmaker.Army.Base", modifier: baseScouting }),
                scoutAdjustment
                    ? new ModifierPF2e({
                          slug: "adjustment",
                          label: "PF2E.Kingmaker.Army.Adjustment",
                          modifier: scoutAdjustment,
                      })
                    : null,
            ]),
        });

        for (const saveType of ["maneuver", "morale"] as const) {
            const table = this.system.saves.strongSave === saveType ? ARMY_STATS.strongSave : ARMY_STATS.weakSave;
            const baseValue = table[this.level];
            const adjustment = this.system.saves[saveType] - baseValue;

            this[saveType] = new Statistic(this, {
                slug: saveType,
                label: `PF2E.Kingmaker.Army.Save.${saveType}`,
                modifiers: R.compact([
                    new ModifierPF2e({ slug: "base", label: "PF2E.Kingmaker.Army.Base", modifier: baseValue }),
                    adjustment
                        ? new ModifierPF2e({
                              slug: "adjustment",
                              label: "PF2E.Kingmaker.Army.Adjustment",
                              modifier: adjustment,
                          })
                        : null,
                ]),
            });
        }

        this.initiative = new ActorInitiative(this, { statistic: "scouting" });

        this.strikes = {
            melee: this.prepareArmyStrike("melee"),
            ranged: this.prepareArmyStrike("ranged"),
        };
    }

    prepareArmyStrike(type: "melee" | "ranged"): ArmyStrike {
        const synthetics = this.synthetics;
        const data = this.system.weapons[type];

        const attackDomains = ["army-attack-roll"];

        const statistic = new Statistic(this, {
            slug: `${type}-strike`,
            label: data.name,
            domains: attackDomains,
            rollOptions: [`item:${type}`],
            check: { type: "attack-roll" },
            modifiers: R.compact([
                new ModifierPF2e({
                    slug: "base",
                    label: "PF2E.Kingmaker.Army.Base",
                    modifier: ARMY_STATS.attack[this.level],
                }),
                data.potency && new ModifierPF2e({ slug: "potency", label: "Potency", modifier: data.potency }),
            ]),
        });

        return {
            slug: `${type}-strike`,
            label: data.name,
            type: "strike",
            variants: [0, 1, 2].map((idx) => {
                const penalty = -5 * idx;

                const mapSlug = "multiple-attack-penalty";
                const mapModifier = new ModifierPF2e({
                    slug: mapSlug,
                    label: "PF2E.MultipleAttackPenalty",
                    modifier: penalty,
                    adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, attackDomains, mapSlug),
                });

                return {
                    label:
                        idx === 0
                            ? signedInteger(statistic.mod)
                            : game.i18n.format("PF2E.MAPAbbreviationValueLabel", {
                                  value: signedInteger(statistic.mod + penalty),
                                  penalty,
                              }),
                    mod: statistic.mod,
                    roll: async (params: AttackRollParams) => {
                        const targetToken = params.target ?? game.user.targets.find((t) => !!t.actor?.isOfType("army"));

                        return statistic.roll({
                            melee: type === "melee",
                            modifiers: penalty !== 0 ? [mapModifier] : [],
                            target: targetToken?.actor,
                            dc: params.dc ?? targetToken?.actor?.armorClass,
                            ...eventToRollParams(params.event, { type: "check" }),
                        });
                    },
                };
            }),
        };
    }

    /** Updates the army's level, scaling all attributes that are intended to scale as the army levels up */
    updateLevel(newLevel: number): Promise<this | undefined> {
        newLevel = Math.clamped(newLevel, 1, 20);
        const currentLevel = this.system.details.level.value;

        const strongSave = this.system.saves.strongSave;
        const strongSaveDifference = ARMY_STATS.strongSave[newLevel] - ARMY_STATS.strongSave[currentLevel];
        const weakSaveDifference = ARMY_STATS.weakSave[newLevel] - ARMY_STATS.weakSave[currentLevel];

        return this.update({
            system: {
                ac: {
                    value: this.system.ac.value + (ARMY_STATS.ac[newLevel] - ARMY_STATS.ac[currentLevel]),
                },
                details: {
                    level: {
                        value: newLevel,
                    },
                },
                saves: {
                    maneuver:
                        this.system.saves.maneuver +
                        (strongSave === "maneuver" ? strongSaveDifference : weakSaveDifference),
                    morale:
                        this.system.saves.morale +
                        (strongSave === "morale" ? strongSaveDifference : weakSaveDifference),
                },
                scouting: this.system.scouting + (ARMY_STATS.scouting[newLevel] - ARMY_STATS.scouting[currentLevel]),
            },
        });
    }

    /** Prevent addition of invalid tactic types */
    override checkItemValidity(source: PreCreate<ItemSourcePF2e>): boolean {
        if (source.type === "campaignFeature" && source.system?.category === "army-tactic") {
            const validArmyTypes = ARMY_TYPES.filter((t) => source.system?.traits?.value?.includes(t));
            if (validArmyTypes.length > 0 && !validArmyTypes.includes(this.system.traits.type)) {
                ui.notifications.error(
                    game.i18n.format("PF2E.Kingmaker.Army.Error.InvalidTacticType", {
                        name: source.name,
                        type: game.i18n.localize(CONFIG.PF2E.kingmakerTraits[this.system.traits.type]),
                    }),
                );
                return false;
            }
        }

        return super.checkItemValidity(source);
    }

    override getStatistic(slug: string): Statistic | null {
        if (tupleHasValue(["scouting", "morale", "maneuver"], slug)) {
            return this[slug];
        }

        return this.kingdom?.getStatistic(slug) ?? super.getStatistic(slug);
    }
}

interface ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: ArmySource;
    system: ArmySystemData;

    get hitPoints(): HitPointsSummary;
}

export { ArmyPF2e };
