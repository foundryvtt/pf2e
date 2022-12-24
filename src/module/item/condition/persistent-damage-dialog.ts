import { ActorPF2e } from "@actor";
import { DAMAGE_TYPES, DAMAGE_TYPE_ICONS } from "@system/damage";
import { DamageRoll } from "@system/damage/roll";
import { htmlClosest, htmlQuery, htmlQueryAll, sortBy } from "@util";
import { ConditionPF2e } from "./document";

class PersistentDamageDialog extends Application {
    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.id = "persistent-dialog";
        options.classes = ["persistent-damage-dialog"];
        options.title = game.i18n.localize("PF2E.ConditionTypePersistent");
        options.template = "systems/pf2e/templates/items/persistent-damage-dialog.hbs";
        options.width = 380;
        options.height = "auto";
        return options;
    }

    constructor(private actor: ActorPF2e, options: Partial<FormApplicationOptions> = {}) {
        super(options);
        actor.apps[this.appId] = this;
    }

    /** Overriden to guarantee one persistent damage dialog per actor */
    override get id() {
        return "persistent-damage-dialog";
    }

    override async getData(): Promise<PersistentDialogSheetData> {
        const existing = this.actor?.items.filter(
            (i): i is Embedded<ConditionPF2e> => i.isOfType("condition") && i.slug === "persistent-damage"
        );
        return {
            existing,
            damageTypes: this.prepareDamageTypes(),
        };
    }

    prepareDamageTypes(): DamageTypeSheetData[] {
        const types = [...DAMAGE_TYPES].map((type) => {
            return {
                type,
                iconClass: `fa-${DAMAGE_TYPE_ICONS[type]}`,
                label: game.i18n.localize(CONFIG.PF2E.damageTypes[type] ?? type),
            };
        });

        return sortBy(types, (type) => type.label);
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        const html = $html[0];

        for (const section of htmlQueryAll(html, ".persistent-entry[data-id")) {
            const id = section.dataset.id;
            const existing = this.actor.items.get(id, { strict: true });
            const elements = this.#getInputElements(section);

            for (const element of Object.values(elements)) {
                element?.addEventListener("change", () => {
                    const formula = elements.formula?.value.trim() ?? "";
                    const damageType = elements.damageType?.value;
                    const dc = Number(elements.dc?.value) || 15;
                    if (formula === "" || !DamageRoll.validate(`(${formula})[${damageType}]`)) {
                        elements.formula?.classList.add("invalid");
                    } else {
                        existing.update({ system: { persistent: { formula, damageType, dc } } });
                    }
                });
            }

            htmlQuery(section, "[data-action=delete")?.addEventListener("click", () => {
                existing.delete();
            });
        }

        html.querySelector("[data-action=add]")?.addEventListener("click", (event) => {
            const section = htmlClosest(event.target, ".persistent-entry");
            if (!section) return;

            const elements = this.#getInputElements(section);
            const formula = elements.formula?.value.trim() ?? "";
            const damageType = elements.damageType?.value;
            const dc = Number(elements.dc?.value) || 15;

            if (formula === "" || !DamageRoll.validate(`(${formula})[${damageType}]`)) {
                elements.formula?.classList.add("invalid");
            } else {
                const baseConditionSource = game.pf2e.ConditionManager.getCondition("persistent-damage").toObject();
                const persistentSource = mergeObject(baseConditionSource, {
                    system: {
                        persistent: { formula, damageType, dc },
                    },
                });
                this.actor.createEmbeddedDocuments("Item", [persistentSource]);
            }
        });
    }

    #getInputElements(section: HTMLElement) {
        return {
            formula: htmlQuery<HTMLInputElement>(section, ".formula"),
            damageType: htmlQuery<HTMLSelectElement>(section, ".damageType"),
            dc: htmlQuery<HTMLInputElement>(section, ".dc"),
        };
    }
}

interface PersistentDialogSheetData {
    existing: ConditionPF2e[];
    damageTypes: DamageTypeSheetData[];
}

interface DamageTypeSheetData {
    type: string;
    iconClass: string;
    label: string;
}

export { PersistentDamageDialog as PersistentDialog };
