import { ActorPF2e } from "@actor";
import { damageDiceIcon } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { DamageType } from "@system/damage/types.ts";
import { DAMAGE_TYPE_ICONS } from "@system/damage/values.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, pick, sortBy } from "@util";
import { PersistentDamagePF2e } from "./document.ts";

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
            .filter((c): c is PersistentDamagePF2e<ActorPF2e> => c.slug === "persistent-damage")
            .map((c) => ({
                id: c.id,
                bullet: damageDiceIcon(c.system.persistent.damage).outerHTML,
                active: c.active,
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

        return types.sort(sortBy((type) => type.label));
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

        html.querySelector("[data-action=roll-persistent]")?.addEventListener("click", () => {
            const existing = this.actor.itemTypes.condition.filter(
                (c): c is PersistentDamagePF2e<ActorPF2e> => c.slug === "persistent-damage"
            );

            for (const condition of existing) {
                condition.onEndTurn();
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

    /** Overriden to autofocus on first render behavior */
    protected override _injectHTML($html: JQuery<HTMLElement>): void {
        super._injectHTML($html);

        // Since this is an initial render, focus the roll button
        htmlQuery($html[0], ".new .formula")?.focus();
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
