import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { ArmyPF2e } from "./document.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { Alignment } from "./types.ts";
import { ALIGNMENTS, ARMY_TYPES } from "./values.ts";
import { kingmakerTraits } from "@scripts/config/traits.ts";
import * as R from "remeda";
import { htmlClosest, htmlQuery, htmlQueryAll, objectHasKey } from "@util";
import { getAdjustment } from "@module/sheet/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CampaignFeaturePF2e } from "@item";

class ArmySheetPF2e extends ActorSheetPF2e<ArmyPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "army"],
            template: "systems/pf2e/templates/actors/army/sheet.hbs",
        };
    }

    override async getData(options?: Partial<ActorSheetOptions>): Promise<ArmySheetData> {
        const data = await super.getData(options);
        const campaignFeatures = this.actor.itemTypes.campaignFeature;

        return {
            ...data,
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

        htmlQuery(html, "[data-action=edit-description]")?.addEventListener("click", () => {
            this.activateEditor("system.details.description");
        });

        for (const strikeAttack of htmlQueryAll(html, "[data-action=strike-attack]")) {
            const type = htmlClosest(strikeAttack, "[data-strike]")?.dataset.strike;
            const variant = Number(strikeAttack.dataset.variantIndex);
            if (!objectHasKey(this.actor.strikes, type)) continue;

            strikeAttack.addEventListener("click", (event) => {
                this.actor.strikes[type].variants[variant]?.roll({ event });
            });
        }
    }
}

interface ArmySheetData extends ActorSheetDataPF2e<ArmyPF2e> {
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
