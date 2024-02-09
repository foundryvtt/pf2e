import { FeatGroup } from "@actor/character/feats.ts";
import { Sense } from "@actor/creature/sense.ts";
import { ActorInitiative } from "@actor/initiative.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { Kingdom } from "@actor/party/kingdom/model.ts";
import { type CampaignFeaturePF2e } from "@item";
import type { ItemSourcePF2e, ItemType } from "@item/base/data/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { extractDamageDice, extractModifierAdjustments, extractModifiers } from "@module/rules/helpers.ts";
import type { UserPF2e } from "@module/user/index.ts";
import type { TokenDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { DamagePF2e } from "@system/damage/damage.ts";
import { createDamageFormula } from "@system/damage/formula.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { DamageRollContext, SimpleDamageTemplate } from "@system/damage/types.ts";
import type { AttackRollParams, DamageRollParams } from "@system/rolls.ts";
import { ArmorStatistic, Statistic, StatisticDifficultyClass } from "@system/statistic/index.ts";
import { createHTMLElement, signedInteger, tupleHasValue } from "@util";
import * as R from "remeda";
import { ActorPF2e, type ActorUpdateContext, type HitPointsSummary } from "../base.ts";
import type { ArmySource, ArmySystemData } from "./data.ts";
import type { ArmyStrike } from "./types.ts";
import { ARMY_STATS, ARMY_TYPES } from "./values.ts";

class ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    declare scouting: Statistic;
    declare maneuver: Statistic;
    declare morale: Statistic;

    declare tactics: FeatGroup<ArmyPF2e, CampaignFeaturePF2e>;
    declare bonusTactics: FeatGroup<ArmyPF2e, CampaignFeaturePF2e>;

    declare strikes: Record<string, ArmyStrike | null>;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return ["campaignFeature", "effect"];
    }

    get underRoutThreshold(): boolean {
        return this.hitPoints.value <= this.system.attributes.hp.routThreshold;
    }

    /** Gets the active kingdom. Later this should be configurable based on alliance */
    get kingdom(): Kingdom | null {
        if (this.alliance === "party") {
            const campaign = game.actors.party?.campaign;
            return campaign instanceof Kingdom ? campaign : null;
        }
        return null;
    }

    get maxTactics(): number {
        return ARMY_STATS.maxTactics[this.level];
    }

    override prepareData(): void {
        super.prepareData();
        this.kingdom?.notifyUpdate();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Set certain properties to their default values if omitted
        this.system.ac.value ??= this._source.system.ac.value ??= ARMY_STATS.ac[this.level];
        this.system.scouting ??= this._source.system.scouting ??= ARMY_STATS.scouting[this.level];

        this.system.details.level.value = Math.clamped(this.system.details.level.value, 1, 20);
        this.system.resources.potions.max = 3;
        this.system.saves.strongSave = this.system.saves.maneuver >= this.system.saves.morale ? "maneuver" : "morale";
        this.system.perception = { senses: [] };

        this.system.details.alliance = this.hasPlayerOwner ? "party" : "opposition";

        this.rollOptions.all[`self:trait:${this.system.traits.type}`] = true;
        this.rollOptions.all["self:under-rout-threshold"] = this.underRoutThreshold;
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

        // Clamp consumption to 0
        this.system.consumption = Math.max(0, this.system.consumption);

        if (this.itemTypes.campaignFeature.some((f) => f.slug === "darkvision")) {
            const sense = new Sense({ type: "darkvision" }, { parent: this }).toObject(false);
            this.system.perception.senses.push(sense);
        } else if (this.itemTypes.campaignFeature.some((f) => f.slug === "low-light-vision")) {
            const sense = new Sense({ type: "low-light-vision" }, { parent: this }).toObject(false);
            this.system.perception.senses.push(sense);
        }

        this.tactics = new FeatGroup(this, {
            id: "tactics",
            label: "PF2E.Kingmaker.Army.Tactics",
            slots: R.range(0, this.maxTactics).map((idx) => ({ id: String(idx), label: "" })),
        });
        this.bonusTactics = new FeatGroup(this, {
            id: "bonus",
            label: "PF2E.Kingmaker.Army.TacticsFree",
        });

        const expectedAC = ARMY_STATS.ac[this.level];
        const acAdjustment = this.system.ac.value - expectedAC;
        this.armorClass = new ArmorStatistic(this, {
            attribute: null,
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
            domains: ["scouting"],
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
                domains: ["saving-throw", saveType],
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

        const tiebreakPriority = this.hasPlayerOwner ? 2 : 1;
        this.initiative = new ActorInitiative(this, { statistic: "scouting", tiebreakPriority });
        this.strikes = R.flatMapToObj(["melee", "ranged"] as const, (t) =>
            this.system.weapons[t] ? [[t, this.prepareArmyStrike(t)]] : [],
        );

        for (const tactic of this.itemTypes.campaignFeature.filter((i) => i.category === "army-tactic")) {
            if (!this.tactics.assignFeat(tactic)) {
                this.bonusTactics.assignFeat(tactic);
            }
        }
    }

    async usePotion(): Promise<void> {
        const newPotions = Math.max(0, this.system.resources.potions.value - 1);
        const newHP = Math.min(this.attributes.hp.value + 1, this.attributes.hp.max);
        await this.update({
            "system.attributes.hp.value": newHP,
            "system.resources.potions.value": newPotions,
        });

        await ChatMessagePF2e.create({
            speaker: ChatMessagePF2e.getSpeaker({ actor: this as ArmyPF2e, token: this.token }),
            flavor: createHTMLElement("div", {
                children: [
                    createHTMLElement("strong", {
                        children: [game.i18n.localize("PF2E.Kingmaker.Army.Potions.UsedPotionHeader")],
                    }),
                    document.createElement("hr"),
                ],
            }).outerHTML,
            content: createHTMLElement("p", {
                children: [game.i18n.localize("PF2E.Kingmaker.Army.Potions.UsedPotionContent")],
            }).outerHTML,
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
        });
    }

    prepareArmyStrike(type: "melee" | "ranged"): ArmyStrike | null {
        const synthetics = this.synthetics;
        const data = this.system.weapons[type];
        if (data === null) return null;

        const attackDomains = ["attack", "attack-roll", `${type}-attack-roll`];

        // Multiple attack penalty (note: calculateMAPs() requires an item, we only have an actor here)
        const maps = (() => {
            const baseMap = {
                slug: "multiple-attack-penalty",
                label: "PF2E.MultipleAttackPenalty",
                map1: -5,
                map2: -10,
            };
            const optionSet = new Set(this.getRollOptions(attackDomains));
            const maps = this.synthetics.multipleAttackPenalties ?? {};
            const fromSynthetics = attackDomains
                .flatMap((d) => maps[d] ?? [])
                .filter((p) => p.predicate?.test(optionSet) ?? true)
                .map((p) => ({ slug: baseMap.slug, label: p.label, map1: p.penalty, map2: p.penalty * 2 }));
            return [baseMap, ...fromSynthetics].reduce((lowest, p) => (p.map1 > lowest.map1 ? p : lowest));
        })();

        const createMapModifier = (prop: "map1" | "map2") => {
            return new ModifierPF2e({
                slug: maps.slug,
                label: maps.label,
                modifier: maps[prop],
                adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, attackDomains, maps.slug),
            });
        };

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

            // Compute damage formula. Since army damage has no category/type, we skip processing stacking rules here
            const { formula, breakdown } = createDamageFormula({
                base: [{ modifier: outcome === "success" ? 1 : 2, damageType: "untyped", category: null }],
                modifiers: extractModifiers(context.self.actor.synthetics, domains, { test: context.options }),
                dice: extractDamageDice(context.self.actor.synthetics.damageDice, domains, {
                    test: context.options,
                    resolvables: { target: context.target?.actor ?? null },
                }),
                ignoredResistances: [],
            });

            const template: SimpleDamageTemplate = {
                name: "Army damage",
                materials: [],
                modifiers: [],
                damage: { roll: new DamageRoll(formula), breakdown },
            };

            return DamagePF2e.roll(template, damageContext);
        };

        return {
            slug: `${type}-strike`,
            label: data.name,
            type: "strike",
            glyph: "A",
            variants: [0, 1, 2].map((idx) => {
                const mapModifier = idx === 0 ? null : createMapModifier(`map${idx as 1 | 2}`);
                const penalty = mapModifier?.modifier ?? 0;

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

                        const roll = await statistic.roll({
                            identifier: type,
                            action: "army-strike",
                            melee: type === "melee",
                            modifiers: mapModifier ? [mapModifier] : [],
                            target: targetToken?.actor,
                            dc: { slug: "ac" },
                            damaging: true,
                            extraRollOptions: ["origin:action:slug:army-strike"],
                            ...eventToRollParams(params.event, { type: "check" }),
                        });

                        if (roll && type === "ranged") {
                            const newAmmo = Math.max(0, this.system.resources.ammunition.value - 1);
                            this.update({ "system.resources.ammunition.value": newAmmo });
                        }

                        return roll;
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

    override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ActorUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (typeof changed?.system?.attributes?.hp?.value === "number") {
            const max = Number(changed.system.attributes.hp.max ?? this.system.attributes.hp.max);
            changed.system.attributes.hp.value = Math.clamped(changed.system.attributes.hp.value, 0, max);
        }

        return super._preUpdate(changed, options, user);
    }

    override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);
        this.kingdom?.reset();
    }
}

interface ArmyPF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: ArmySource;
    armorClass: StatisticDifficultyClass<ArmorStatistic>;
    system: ArmySystemData;

    get hitPoints(): HitPointsSummary;
}

export { ArmyPF2e };
