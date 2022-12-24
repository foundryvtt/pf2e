import { ActorPF2e } from "@actor";
import { damageDiceIcon, DamageType, DAMAGE_TYPE_ICONS } from "@system/damage";
import { DamageRoll } from "@system/damage/roll";
import { htmlClosest, htmlQuery, htmlQueryAll, pick, sortBy } from "@util";
import { PersistentDamagePF2e } from "./document";

class PersistentDamageDialog extends Application {
    constructor(private actor: ActorPF2e, options: Partial<ApplicationOptions> = {}) {
        super(options);
        actor.apps[this.appId] = this;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["persistent-damage-dialog"],
            template: "systems/pf2e/templates/items/persistent-damage-dialog.hbs",
            width: 380,
            height: "auto",
        };
    }

    /** Override to guarantee one persistent damage dialog per actor */
    override get id(): string {
        return `persistent-damage-${this.actor.id}`;
    }

    override get title(): string {
        return game.i18n.format("PF2E.Item.Condition.PersistentDamage.Dialog.Title", { actor: this.actor.name });
    }

    override async getData(): Promise<PersistentDialogData> {
        const existing = this.actor.itemTypes.condition
            .filter((c): c is Embedded<PersistentDamagePF2e> => c.slug === "persistent-damage")
            .map((c) => ({
                id: c.id,
                bullet: damageDiceIcon(c.system.persistent.damage).outerHTML,
                active: c.isActive,
                ...pick(c.system.persistent, ["formula", "damageType", "dc"]),
            }));

        return {
            existing,
            damageTypes: this.#prepareDamageTypes(),
        };
    }

    #prepareDamageTypes(): DamageTypeData[] {
        const types = Object.keys(CONFIG.PF2E.damageTypes).map((type) => {
            const labels: Record<string, string | undefined> = CONFIG.PF2E.damageTypes;
            const icons: Record<string, string | null | undefined> = DAMAGE_TYPE_ICONS;
            const faGlyph = icons[type] ?? "question";
            return {
                type,
                iconClass: `fa-${faGlyph}`,
                label: game.i18n.localize(labels[type] ?? type),
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
            const formula = elements.formula?.value.trim() || "1d6";
            const damageType = elements.damageType?.value;
            const dc = Number(elements.dc?.value) || 15;

            if (!DamageRoll.validate(`(${formula})[${damageType}]`)) {
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

interface PersistentDialogData {
    existing: DamageEntryData[];
    damageTypes: DamageTypeData[];
}

interface DamageEntryData {
    id: string;
    bullet: string;
    active: boolean;
    formula: string;
    damageType: DamageType;
    dc: number;
}

interface DamageTypeData {
    type: string;
    iconClass: string;
    label: string;
}

export { PersistentDamageDialog as PersistentDialog };
