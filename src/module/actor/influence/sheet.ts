import { CreaturePF2e } from "@actor";
import { InfluenceSheetData } from "@actor/influence/types";
import { InfluenceDifficultyClass } from "@actor/creature/data";
import { htmlClosest, htmlQueryAll } from "@util";

class InfluenceSheetPF2e<TActor extends CreaturePF2e> extends ActorSheet<TActor> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        return foundry.utils.mergeObject(options, {
            classes: [...options.classes, "pf2e", "influence"],
            template: "systems/pf2e/templates/actors/influence/sheet.hbs",
        });
    }

    override get title(): string {
        return game.i18n.format("PF2E.InfluenceSheet.Title", { name: this.actor.name });
    }

    override async getData(): Promise<InfluenceSheetData<TActor>> {
        const sheetData = super.getData() as InfluenceSheetData<TActor>;

        sheetData.editable = false;
        sheetData.label = {
            rarity: CONFIG.PF2E.rarityTraits,
            size: CONFIG.PF2E.actorSizes,
            statistic: {
                perception: "PF2E.PerceptionLabel",
                ...CONFIG.PF2E.skillList,
            },
            trait: CONFIG.PF2E.monsterTraits,
        };

        return sheetData;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const section of htmlQueryAll(html, "section[data-statistic]")) {
            section.addEventListener("click", (event) => {
                if (event.target instanceof HTMLElement) {
                    const { action } = event.target.dataset;
                    const { statistic } = section.dataset;
                    if (action === "roll-check" && statistic === "perception") {
                        this.actor.perception.check.roll();
                    } else if (action === "roll-check" && statistic === "will") {
                        this.actor.saves.will.check.roll();
                    }
                }
            });
        }

        for (const section of htmlQueryAll(html, "section[data-type=discovery],section[data-type=skills]")) {
            section.addEventListener("click", (event) => {
                if (event.target instanceof HTMLElement) {
                    const statistic = htmlClosest(event.target, "[data-slug]");
                    if (statistic) {
                        const { action: interaction } = event.target.dataset;
                        const { type } = section.dataset;
                        const { slug } = statistic.dataset;
                        if (interaction === "comment" && slug) {
                            const action = type === "discovery" ? "discover" : "influence";
                            const property = getProperty(
                                this.actor,
                                `system.influence.${type}.${slug}`
                            ) as InfluenceDifficultyClass;
                            const labels: Record<string, string> = {
                                perception: "PF2E.PerceptionLabel",
                                ...CONFIG.PF2E.skillList,
                            };
                            const label = property.label?.trim() || game.i18n.localize(labels[slug] ?? "PF2E.Lore");
                            ChatMessage.create({
                                content: `<span data-pf2-action="${action}" data-pf2-skill="${slug}">${label}</span>`,
                            });
                            return false;
                        }
                    }
                }
                return false;
            });
        }
    }
}

export { InfluenceSheetPF2e };
