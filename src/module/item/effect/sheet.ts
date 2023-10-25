import { EffectBadgeSource } from "@item/abstract-effect/index.ts";
import { ErrorPF2e } from "@util";
import { htmlQuery, htmlQueryAll } from "@util/dom.ts";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "../base/sheet/base.ts";
import { EffectSource } from "./data.ts";
import { EffectPF2e } from "./document.ts";

export class EffectSheetPF2e extends ItemSheetPF2e<EffectPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<EffectSheetData> {
        const badge = this.item.badge;

        return {
            ...(await super.getData(options)),
            hasSidebar: true,
            itemType: game.i18n.localize("PF2E.LevelLabel"),
            badgeType: badge ? game.i18n.localize(`PF2E.Item.Effect.Badge.Type.${badge.type}`) : "",
            timeUnits: CONFIG.PF2E.timeUnits,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Prevent the form from submitting when the Badge Type select menu is changed
        htmlQuery(html, "select.badge-type")?.addEventListener("change", (event) => {
            event.stopPropagation();
        });

        htmlQuery(html, "[data-action=badge-add]")?.addEventListener("click", () => {
            const type = htmlQuery<HTMLSelectElement>(html, ".badge-type")?.value;
            const badge: EffectBadgeSource =
                type === "formula" ? { type: "formula", value: "1d20", evaluate: true } : { type: "counter", value: 1 };
            this.item.update({ system: { badge } });
        });

        htmlQuery(html, "[data-action=badge-delete]")?.addEventListener("click", () => {
            this.item.update({ "system.-=badge": null });
        });

        htmlQuery(html, "[data-action=badge-add-label")?.addEventListener("click", () => {
            if (!this.item.system.badge) throw ErrorPF2e("Unexpected error adding badge label");
            const labels = this.item.system.badge.labels ?? [];
            labels.push("");
            this.item.update({ system: { badge: { labels } } });
        });

        for (const deleteIcon of htmlQueryAll(html, "[data-action=badge-delete-label]")) {
            const index = Number(deleteIcon.dataset.idx);
            deleteIcon.addEventListener("click", () => {
                const labels = this.item.system.badge?.labels;
                if (labels) {
                    labels.splice(index, 1);
                    if (labels.length === 0) {
                        this.item.update({ "system.badge.-=labels": null });
                    } else {
                        this.item.update({ system: { badge: { labels } } });
                    }
                }
            });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const expanded = expandObject<DeepPartial<EffectSource>>(formData);
        const badge = expanded.system?.badge;
        if (badge) {
            // Ensure badge labels remain an array
            if ("labels" in badge && typeof badge.labels === "object") {
                badge.labels = Object.values(badge.labels);
            }
            // Null out empty-string `badge.reevaluate`
            if ("reevaluate" in badge) {
                badge.reevaluate ||= null;
            }
        }

        super._updateObject(event, flattenObject(expanded));
    }
}

interface EffectSheetData extends ItemSheetDataPF2e<EffectPF2e> {
    badgeType: string;
    timeUnits: ConfigPF2e["PF2E"]["timeUnits"];
}
