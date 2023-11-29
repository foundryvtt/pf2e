import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { CampaignFeaturePF2e } from "@item";
import { AdjustedValue, getAdjustedValue, getAdjustment } from "@module/sheet/helpers.ts";
import { kingmakerTraits } from "@scripts/config/traits.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, objectHasKey, tupleHasValue } from "@util";
import * as R from "remeda";
import { ArmyPF2e } from "./document.ts";
import { Alignment } from "./types.ts";
import { ALIGNMENTS, ARMY_TYPES } from "./values.ts";

class ArmySheetPF2e extends ActorSheetPF2e<ArmyPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "army"],
            width: 750,
            height: 625,
            template: "systems/pf2e/templates/actors/army/sheet.hbs",
        };
    }

    override async getData(options?: Partial<ActorSheetOptions>): Promise<ArmySheetData> {
        const data = await super.getData(options);
        const actor = this.actor;
        const campaignFeatures = actor.itemTypes.campaignFeature;

        return {
            ...data,
            ac: {
                value: actor.armorClass.value,
                breakdown: actor.armorClass.breakdown,
                // When getting the ac adjustment class, factor in potency in the base (or it'll always be blue...)
                adjustmentClass: getAdjustment(
                    actor.armorClass.value,
                    actor._source.system.ac.value + actor.system.ac.potency,
                ),
            },
            hitPoints: {
                value: actor.system.attributes.hp.value,
                max: getAdjustedValue(actor.system.attributes.hp.max, actor._source.system.attributes.hp.max),
                routThreshold: getAdjustedValue(
                    actor.system.attributes.hp.routThreshold,
                    actor._source.system.attributes.hp.routThreshold,
                    { better: "lower" },
                ),
            },
            alignments: ALIGNMENTS,
            armyTypes: R.pick(kingmakerTraits, ARMY_TYPES),
            rarityTraits: CONFIG.PF2E.rarityTraits,
            saves: (["morale", "maneuver"] as const).map((slug) => {
                const statistic = this.actor[slug];
                return {
                    slug: slug,
                    label: statistic.label,
                    mod: statistic.mod,
                    breakdown: statistic.check.breakdown,
                    adjustmentClass: getAdjustment(statistic.mod, this.actor._source.system.saves[slug]),
                };
            }),
            tactics: campaignFeatures.filter((f) => f.category === "army-tactic"),
            warActions: campaignFeatures.filter((f) => f.category === "army-war-action"),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        const levelInput = htmlQuery<HTMLInputElement>(html, ".level");
        levelInput?.addEventListener("change", () => {
            const value = levelInput.value;
            this.actor.updateLevel(Number(value));
        });

        for (const rollableStat of htmlQueryAll(html, ".rollable")) {
            const statSlug = htmlClosest(rollableStat, "[data-statistic]")?.dataset.statistic;
            if (!statSlug) continue;

            rollableStat.addEventListener("click", (event) => {
                const statistic = this.actor.getStatistic(statSlug);
                statistic?.roll(eventToRollParams(event, { type: "check" }));
            });
        }

        // Handle direct magic armor updates
        for (const gearElement of htmlQueryAll(html, "[data-action=change-magic-armor]")) {
            gearElement.addEventListener("click", () => {
                const newValue = Math.clamped(this.actor.system.ac.potency + 1, 0, 3);
                this.actor.update({ [`system.ac.potency`]: newValue });
            });
            gearElement.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                const newValue = Math.clamped(this.actor.system.ac.potency - 1, 0, 3);
                this.actor.update({ [`system.ac.potency`]: newValue });
            });
        }

        // Handle direct magic weapon updates
        for (const gearElement of htmlQueryAll(html, "[data-action=change-magic-weapon]")) {
            const gear = gearElement.dataset.weapon;
            if (!tupleHasValue(["melee", "ranged"], gear)) return;
            const data = this.actor.system.weapons[gear];
            gearElement.addEventListener("click", () => {
                if (data) {
                    const newValue = Math.clamped(data.potency + 1, 0, 3);
                    this.actor.update({ [`system.weapons.${gear}.potency`]: newValue });
                } else {
                    const newData = { name: "", potency: 0 };
                    this.actor.update({ [`system.weapons.${gear}`]: newData });
                }
            });
            gearElement.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                if (!data) return;

                if (data.potency === 0) {
                    this.actor.update({ [`system.weapons.${gear}`]: null });
                } else {
                    const newValue = Math.clamped(data.potency - 1, 0, 3);
                    this.actor.update({ [`system.weapons.${gear}.potency`]: newValue });
                }
            });
        }

        htmlQuery(html, "[data-action=edit-description]")?.addEventListener("click", () => {
            this.activateEditor("system.details.description");
        });

        for (const strikeAttack of htmlQueryAll(html, "[data-action=strike-attack]")) {
            const type = htmlClosest(strikeAttack, "[data-strike]")?.dataset.strike;
            const variant = Number(strikeAttack.dataset.variantIndex);
            if (!objectHasKey(this.actor.strikes, type)) continue;

            strikeAttack.addEventListener("click", (event) => {
                this.actor.strikes[type]?.variants[variant]?.roll({ event });
            });
        }

        for (const strikeDamage of htmlQueryAll(html, "[data-action=strike-damage]")) {
            const type = htmlClosest(strikeDamage, "[data-strike]")?.dataset.strike;
            const outcome = strikeDamage.dataset.outcome === "criticalSuccess" ? "critical" : "damage";
            if (!objectHasKey(this.actor.strikes, type)) continue;

            strikeDamage.addEventListener("click", (event) => {
                this.actor.strikes[type]?.[outcome]({ event });
            });
        }
    }
}

interface ArmySheetData extends ActorSheetDataPF2e<ArmyPF2e> {
    ac: {
        value: number;
        breakdown: string;
        adjustmentClass: string | null;
    };
    hitPoints: {
        value: number;
        max: AdjustedValue;
        routThreshold: AdjustedValue;
    };
    alignments: Iterable<Alignment>;
    armyTypes: Record<string, string>;
    rarityTraits: Record<string, string>;
    saves: ArmySaveSheetData[];
    tactics: CampaignFeaturePF2e[];
    warActions: CampaignFeaturePF2e[];
}

interface ArmySaveSheetData {
    slug: string;
    label: string;
    mod: number;
    breakdown: string;
    adjustmentClass: string | null;
}

export { ArmySheetPF2e };
