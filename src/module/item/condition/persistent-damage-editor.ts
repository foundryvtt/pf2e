import type { ActorPF2e } from "@actor";
import type { ApplicationConfiguration } from "@client/applications/_module.mjs";
import { damageDiceIcon } from "@system/damage/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { DamageType } from "@system/damage/types.ts";
import { DAMAGE_TYPE_ICONS } from "@system/damage/values.ts";
import { htmlClosest, htmlQuery } from "@util";
import * as R from "remeda";
import type { PersistentDamagePF2e } from "./document.ts";

class PersistentDamageEditor extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        classes: ["persistent-damage-editor"],
        tag: "form",
        position: {
            width: 380,
        },
        window: {
            contentClasses: ["standard-form"],
        },
        actions: {
            add: PersistentDamageEditor.#onClickAdd,
            delete: PersistentDamageEditor.#onDelete,
            roll: PersistentDamageEditor.#onRoll,
        },
    };

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        main: {
            template: "systems/pf2e/templates/items/persistent-damage-editor.hbs",
            root: true,
        },
    };

    actor: ActorPF2e;

    selectedItemId: string | null;

    constructor(options: DeepPartial<ApplicationConfiguration> & PersistentDamageDialogOptions) {
        super(options);
        this.actor = options.actor;
        this.selectedItemId = options.selectedItemId ?? null;
        this.actor.apps[this.id] = this;
    }

    /** Override to guarantee one persistent damage dialog per actor */
    override get id(): string {
        return `persistent-damage-${this.actor.id}`;
    }

    override get title(): string {
        return game.i18n.format("PF2E.Item.Condition.PersistentDamage.Dialog.Title", { actor: this.actor.name });
    }

    protected override async _prepareContext(): Promise<PersistentDialogContext> {
        const existing = this.actor.itemTypes.condition
            .filter((c): c is PersistentDamagePF2e<ActorPF2e> => c.slug === "persistent-damage")
            .map((c) => ({
                id: c.id,
                bullet: damageDiceIcon(c.system.persistent.damage, { fixedWidth: true }).outerHTML,
                active: c.active,
                ...R.pick(c.system.persistent, ["formula", "damageType", "dc"]),
            }));

        return {
            selectedItemId: this.selectedItemId,
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

        return types.sort((a, b) => a.label.localeCompare(b.label));
    }

    /** Determine whether an inputted formula is valid, reporting to the user if not. */
    #reportFormulaValidity(formula: string, input: HTMLInputElement | null): boolean {
        if (!input) return false;
        const isValid =
            formula.length > 0 &&
            DamageRoll.validate(formula) &&
            new DamageRoll(formula, { evaluatePersistent: true }).maximumValue >= 0;
        if (isValid) {
            input.setCustomValidity("");
        } else {
            input.setCustomValidity(game.i18n.localize("PF2E.Item.Condition.PersistentDamage.Dialog.Invalid"));
            input.addEventListener("input", () => input.setCustomValidity(""), { once: true });
        }

        return input.reportValidity();
    }

    static #onClickAdd(this: PersistentDamageEditor, event: PointerEvent) {
        const section = htmlClosest(event.target, ".persistent-entry");
        if (!section) return;

        const elements = this.#getInputElements(section);
        const formula = elements.formula?.value.trim() || "1d6";
        const damageType = elements.damageType?.value;
        const dc = Number(elements.dc?.value) || 15;

        if (this.#reportFormulaValidity(`(${formula})[${damageType}]`, elements.formula)) {
            const baseConditionSource = game.pf2e.ConditionManager.getCondition("persistent-damage").toObject();
            const persistentSource = fu.mergeObject(baseConditionSource, {
                system: {
                    persistent: { formula, damageType, dc },
                },
            });
            this.actor.createEmbeddedDocuments("Item", [persistentSource]);
        }
    }

    static #onDelete(this: PersistentDamageEditor, event: PointerEvent) {
        const existingId = htmlClosest(event.target, ".persistent-entry[data-id]")?.dataset.id;
        const existing = this.actor.items.get(existingId, { strict: true });
        existing.delete();
    }

    static #onRoll(this: PersistentDamageEditor) {
        const existing = this.actor.itemTypes.condition.filter((c) => c.slug === "persistent-damage");
        for (const condition of existing) {
            condition.onEndTurn();
        }
    }

    protected override _onChangeForm(formConfig: fa.ApplicationFormConfiguration, event: Event): void {
        super._onChangeForm(formConfig, event);

        const section = htmlClosest(event.target, ".persistent-entry[data-id]");
        if (section) {
            const id = section.dataset.id;
            const existing = this.actor.items.get(id, { strict: true });
            const elements = this.#getInputElements(section);
            const formula = elements.formula?.value.trim() ?? "";
            const damageType = elements.damageType?.value;
            const dc = Number(elements.dc?.value) || 15;
            if (this.#reportFormulaValidity(formula, elements.formula)) {
                existing.update({ system: { persistent: { formula, damageType, dc } } });
            }
        }
    }

    #getInputElements(section: HTMLElement) {
        return {
            formula: htmlQuery<HTMLInputElement>(section, ".formula"),
            damageType: htmlQuery<HTMLSelectElement>(section, ".damageType"),
            dc: htmlQuery<HTMLInputElement>(section, ".dc"),
        };
    }
}

interface PersistentDamageDialogOptions {
    actor: ActorPF2e;
    selectedItemId?: string;
}

interface PersistentDialogContext {
    selectedItemId: string | null;
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

export { PersistentDamageEditor };
