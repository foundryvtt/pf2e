import { ActorInitiative } from "@actor/initiative.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { importDocuments } from "@actor/party/kingdom/helpers.ts";
import { Kingdom } from "@actor/party/kingdom/model.ts";
import { ItemPF2e, type CampaignFeaturePF2e } from "@item";
import type { ItemSourcePF2e, ItemType } from "@item/base/data/index.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { DamagePF2e } from "@system/damage/damage.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { DamageRollContext, SimpleDamageTemplate } from "@system/damage/types.ts";
import type { AttackRollParams, DamageRollParams } from "@system/rolls.ts";
import { ArmorStatistic, Statistic, StatisticDifficultyClass } from "@system/statistic/index.ts";
import { signedInteger, tupleHasValue } from "@util";
import * as R from "remeda";
import { ActorPF2e, HitPointsSummary } from "../base.ts";
import type { ArmySource, ArmySystemData } from "./data.ts";
import type { ArmyStrike } from "./types.ts";
import { ARMY_STATS, ARMY_TYPES, BASIC_WAR_ACTIONS_FOLDER } from "./values.ts";

class ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    declare armorClass: StatisticDifficultyClass<ArmorStatistic>;
    declare scouting: Statistic;
    declare maneuver: Statistic;
    declare morale: Statistic;

    declare strikes: Record<string, ArmyStrike | null>;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return ["campaignFeature", "effect"];
    }

    get underRoutThreshold(): boolean {
        return this.hitPoints.value <= this.system.attributes.hp.routThreshold;
    }

    /** Gets the active kingdom. Later this should be configurable based on alliance */
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

    /** Run rule elements */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();
        for (const rule of this.rules) {
            rule.onApplyActiveEffects?.();
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.prepareSynthetics();

        this.rollOptions.all["self:under-rout-threshold"] = this.underRoutThreshold;

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
                this.system.ac.potency &&
                    new ModifierPF2e({ slug: "potency", label: "Potency", modifier: this.system.ac.potency }),
            ]),
        }).dc;
        this.system.ac.value = this.armorClass.value;

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
        this.system.scouting = this.scouting.mod;

        // Add statistics for saving throws
        // Note: Kingmaker refers to these as both a type of save (high/low save) but also as "maneuver check"
        for (const saveType of ["maneuver", "morale"] as const) {
            const table = this.system.saves.strongSave === saveType ? ARMY_STATS.strongSave : ARMY_STATS.weakSave;
            const baseValue = table[this.level];
            const adjustment = this.system.saves[saveType] - baseValue;

            this[saveType] = new Statistic(this, {
                slug: saveType,
                label: `PF2E.Kingmaker.Army.Save.${saveType}`,
                domains: ["all", "saving-throw", `${saveType}-check`],
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
        this.strikes = R.flatMapToObj(["melee", "ranged"] as const, (t) =>
            this.system.weapons[t] ? [[t, this.prepareArmyStrike(t)]] : [],
        );
    }

    prepareArmyStrike(type: "melee" | "ranged"): ArmyStrike | null {
        const synthetics = this.synthetics;
        const data = this.system.weapons[type];
        if (data === null) return null;

        const attackDomains = ["attack-roll", `${type}-attack-roll`];

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
                new ModifierPF2e({
                    slug: "concealed",
                    label: "PF2E.Kingmaker.Army.Condition.concealed.name",
                    type: "circumstance",
                    modifier: -2,
                    predicate: ["target:effect:concealed"],
                    hideIfDisabled: true,
                }),
            ]),
        });

        const dealDamage = async (
            params: DamageRollParams = {},
            outcome: "success" | "criticalSuccess" = "success",
        ): Promise<string | Rolled<DamageRoll> | null> => {
            const targetToken = params.target ?? game.user.targets.first() ?? null;

            const domains = ["damage", "strike-damage", `${type}-damage`];

            const context = await this.getDamageRollContext({
                viewOnly: params.getFormula ?? false,
                statistic: statistic.check,
                target: { token: targetToken },
                domains,
                outcome,
                checkContext: params.checkContext,
                options: new Set(),
            });

            const damageContext: DamageRollContext = {
                type: "damage-roll",
                sourceType: "attack",
                self: context.self,
                target: context.target,
                outcome,
                options: context.options,
                domains,
                ...eventToRollParams(params.event, { type: "damage" }),
            };

            const formula = outcome === "success" ? "1" : "2";
            const template: SimpleDamageTemplate = {
                name: "Army damage",
                materials: [],
                modifiers: [],
                damage: { roll: new DamageRoll(formula), breakdown: [] },
            };

            return DamagePF2e.roll(template, damageContext);
        };

        return {
            slug: `${type}-strike`,
            label: data.name,
            type: "strike",
            glyph: "A",
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
                            identifier: type,
                            action: "army-strike",
                            melee: type === "melee",
                            modifiers: penalty !== 0 ? [mapModifier] : [],
                            target: targetToken?.actor,
                            dc: params.dc ?? targetToken?.actor?.armorClass,
                            damaging: true,
                            ...eventToRollParams(params.event, { type: "check" }),
                        });
                    },
                };
            }),
            damage: (params?: DamageRollParams) => {
                return dealDamage(params, "success");
            },
            critical: (params?: DamageRollParams) => {
                return dealDamage(params, "criticalSuccess");
            },
        };
    }

    async importBasicActions({ skipDialog = false }: { skipDialog?: boolean } = {}): Promise<void> {
        const pack = game.packs.get("pf2e.kingmaker-features");
        const compendiumFeaturs = ((await pack?.getDocuments({ type: "campaignFeature" })) ?? []).filter(
            (d): d is CampaignFeaturePF2e<null> => d instanceof ItemPF2e && d.isOfType("campaignFeature"),
        );
        const documents = compendiumFeaturs.filter(
            (d) => d.system.category === "army-war-action" && d.folder?.id === BASIC_WAR_ACTIONS_FOLDER,
        );

        await importDocuments(this, documents, skipDialog);
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

    // Import basic actions when first created
    override _onCreate(data: this["_source"], options: DocumentModificationContext<TParent>, userId: string): void {
        super._onCreate(data, options, userId);
        if (this.primaryUpdater === game.user) {
            this.importBasicActions({ skipDialog: true });
        }
    }
}

interface ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: ArmySource;
    system: ArmySystemData;

    get hitPoints(): HitPointsSummary;
}

export { ArmyPF2e };
