import { ModifierPF2e, MODIFIER_TYPES, DamageDicePF2e, applyStackingRules } from "@actor/modifiers.ts";
import {
    ErrorPF2e,
    htmlQuery,
    htmlQueryAll,
    pick,
    setHasElement,
    sluggify,
    sortStringRecord,
    tupleHasValue,
} from "@util";
import {
    BaseDamageData,
    DamageCategoryUnique,
    DamageDieSize,
    DamageFormulaData,
    DamageRollContext,
    DamageType,
} from "./types.ts";
import { DAMAGE_CATEGORIES_UNIQUE, DAMAGE_TYPE_ICONS } from "./values.ts";
import { createDamageFormula } from "./formula.ts";
import { DamageRoll } from "./roll.ts";

/**
 * Dialog for excluding certain modifiers before rolling damage.
 * @category Other
 */
class DamageModifierDialog extends Application {
    base: BaseDamageData[];
    /** The modifiers which are being edited. */
    modifiers: ModifierPF2e[];
    /** The damage dice which are being edited. */
    dice: DamageDicePF2e[];
    /** The base damage type of this damage roll */
    baseDamageType: DamageType;
    /** Relevant context for this roll, like roll options. */
    context: Partial<DamageRollContext>;
    /** Is this critical damage? */
    isCritical: boolean;
    /** A Promise resolve method */
    #resolve?: (value: boolean) => void;
    /** Was the roll button pressed? */
    isRolled = false;

    constructor(params: DamageDialogParams) {
        super();

        this.base = params.damage.base ?? [];
        this.modifiers = params.damage.modifiers ?? [];
        this.dice = params.damage.dice ?? [];
        this.baseDamageType = params.damage.base.at(0)?.damageType ?? "untyped";
        this.context = params.context ?? {};
        this.isCritical = this.context.outcome === "criticalSuccess";
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            template: "systems/pf2e/templates/chat/damage/damage-modifier-dialog.hbs",
            classes: ["damage-dialog", "dialog"],
            popOut: true,
            width: 480,
            height: "auto",
        };
    }

    override get title(): string {
        return this.isCritical
            ? game.i18n.localize("PF2E.Damage.Dialog.CriticalDamageRoll")
            : game.i18n.localize("PF2E.Damage.Dialog.DamageRoll");
    }

    #getDamageIcon(type: DamageType | null): string | null {
        if (!type) return null;
        const icon = DAMAGE_TYPE_ICONS[type];
        if (icon) {
            return `fa-fw fa-solid fa-${icon} icon`;
        }
        return null;
    }

    #getCategoryIcon(category: DamageCategoryUnique | string | null, damageType: DamageType | null): string | null {
        switch (category) {
            case "persistent":
                return damageType === "bleed" ? null : "fa-fw fa-duotone fa-hourglass icon";
            case "precision":
                return "fa-fw fa-solid fa-crosshairs icon";
            case "splash":
                return "fa-fw fa-solid fa-burst icon";
            default:
                return null;
        }
    }

    #getTypeLabel(damageType: DamageType | null, category: DamageCategoryUnique | null): string | null {
        if (category === "precision") {
            return game.i18n.localize("PF2E.Damage.Precision");
        }
        if (!damageType) return null;
        const typeLabel = game.i18n.localize(CONFIG.PF2E.damageTypes[damageType]);

        switch (category) {
            case "persistent":
                return game.i18n.format("PF2E.Damage.PersistentTooltip", { damageType: typeLabel });
            case "splash":
                return game.i18n.format("PF2E.Damage.Dialog.Splash", { damageType: typeLabel });
            default:
                return typeLabel;
        }
    }

    #getDiceLabel(dice: DamageDicePF2e): string {
        if (!dice.diceNumber || !dice.dieSize) return "";

        const facesLabel = game.i18n.localize(`PF2E.DamageDie${dice.dieSize.toUpperCase()}`);
        return `${dice.diceNumber}${facesLabel}`;
    }

    override async getData(): Promise<DamageDialogData> {
        const showModifier = (m: ModifierPF2e): boolean => {
            if (!this.isCritical && m.critical) {
                return false;
            }
            if (!m.enabled && m.hideIfDisabled) {
                return false;
            }
            return true;
        };
        const modifiers: ModifierData[] = this.modifiers.map((m) => {
            const damageType = m.damageType ?? this.baseDamageType;

            return {
                label: m.label,
                category: m.category,
                type: m.type,
                modifier: m.modifier,
                hideIfDisabled: m.hideIfDisabled,
                damageType,
                typeLabel: this.#getTypeLabel(damageType, m.damageCategory),
                enabled: m.enabled,
                ignored: m.ignored,
                critical: m.critical,
                show: showModifier(m),
                icon: this.#getDamageIcon(damageType),
                categoryIcon: this.#getCategoryIcon(m.category, damageType),
            } satisfies ModifierData;
        });

        const dice: DamageDiceData[] = this.dice.map((d) => ({
            label: d.label,
            category: d.category,
            damageType: d.damageType,
            typeLabel: this.#getTypeLabel(d.damageType, d.category),
            diceLabel: this.#getDiceLabel(d),
            enabled: d.enabled,
            ignored: d.ignored,
            critical: d.critical,
            show: !d.override && (this.isCritical || !d.critical),
            icon: this.#getDamageIcon(d.damageType),
            categoryIcon: this.#getCategoryIcon(d.category, d.damageType),
        }));

        const hasVisibleModifiers = modifiers.filter((m) => m.show).length > 0;
        const hasVisibleDice = dice.filter((d) => d.show).length > 0;

        const result = createDamageFormula({
            base: this.base,
            modifiers: this.modifiers,
            dice: this.dice,
            ignoredResistances: [],
        });
        const roll = new DamageRoll(result.formula);
        const formulaTemplate = (await Promise.all(roll.instances.map((i) => i.render()))).join(" + ");

        return {
            appId: this.id,
            modifiers,
            dice,
            isCritical: this.isCritical,
            hasVisibleDice,
            hasVisibleModifiers,
            damageTypes: sortStringRecord(CONFIG.PF2E.damageTypes),
            damageSubtypes: sortStringRecord(pick(CONFIG.PF2E.damageCategories, DAMAGE_CATEGORIES_UNIQUE)),
            rollModes: CONFIG.Dice.rollModes,
            rollMode: this.context?.rollMode,
            formula: formulaTemplate,
        };
    }

    override activateListeners($html: JQuery): void {
        const html = $html[0];

        htmlQuery<HTMLButtonElement>(html, "button.roll")?.addEventListener("click", () => {
            this.isRolled = true;
            this.close();
        });

        for (const checkbox of htmlQueryAll<HTMLInputElement>(html, ".modifier-container input[type=checkbox]")) {
            checkbox.addEventListener("click", () => {
                const modIndex = Number(checkbox.dataset.modifierIndex);
                const dieIndex = Number(checkbox.dataset.diceIndex);
                if (!Number.isNaN(modIndex)) {
                    this.modifiers[modIndex].ignored = !checkbox.checked;
                    applyStackingRules(this.modifiers);
                } else if (!Number.isNaN(dieIndex)) {
                    this.dice[dieIndex].ignored = !checkbox.checked;
                    this.dice[dieIndex].enabled = checkbox.checked;
                }
                this.render();
            });
        }

        const categorySelect = htmlQuery<HTMLSelectElement>(html, "select.add-dice-category");
        const damageTypeSelect = htmlQuery<HTMLSelectElement>(html, "select.add-dice-type");
        categorySelect?.addEventListener("change", () => {
            if (damageTypeSelect) {
                if (categorySelect.value === "precision") {
                    damageTypeSelect.value = "";
                    damageTypeSelect.disabled = true;
                } else {
                    damageTypeSelect.disabled = false;
                    damageTypeSelect.value = (damageTypeSelect.firstElementChild as HTMLOptionElement)?.value ?? "acid";
                }
            }
        });

        const addModifierButton = htmlQuery<HTMLButtonElement>(html, "button.add-modifier");
        addModifierButton?.addEventListener("click", () => {
            const parent = addModifierButton.parentElement as HTMLDivElement;
            const value = Number(parent.querySelector<HTMLInputElement>(".add-modifier-value")?.value || 1);
            const type = String(parent.querySelector<HTMLSelectElement>(".add-modifier-type")?.value);
            const damageType = (parent.querySelector<HTMLSelectElement>(".add-modifier-damage-type")?.value ??
                null) as DamageType;
            const category = (parent.querySelector<HTMLSelectElement>(".add-modifier-category")?.value ??
                null) as DamageCategoryUnique;

            let name = String(parent.querySelector<HTMLInputElement>(".add-modifier-name")?.value);
            const errors: string[] = [];
            if (Number.isNaN(value)) {
                errors.push("Modifier value must be a number.");
            } else if (value === 0) {
                errors.push("Modifier value must not be zero.");
            }
            if (!setHasElement(MODIFIER_TYPES, type)) {
                // Select menu should make this impossible
                throw ErrorPF2e("Unexpected invalid modifier type");
            }
            if (!name || !name.trim()) {
                name = game.i18n.localize(value < 0 ? `PF2E.PenaltyLabel.${type}` : `PF2E.BonusLabel.${type}`);
            }
            if (errors.length > 0) {
                ui.notifications.error(errors.join(" "));
            } else {
                this.modifiers.push(
                    new ModifierPF2e({
                        label: name,
                        modifier: value,
                        type,
                        damageType,
                        damageCategory: category,
                    })
                );
                applyStackingRules(this.modifiers);
                this.render();
            }
        });

        const addDiceButton = htmlQuery<HTMLButtonElement>(html, "button.add-dice");
        addDiceButton?.addEventListener("click", () => {
            const parent = addDiceButton.parentElement as HTMLDivElement;
            const count = Number(parent.querySelector<HTMLInputElement>(".add-dice-count")?.value || 1);
            const faces = (parent.querySelector<HTMLSelectElement>(".add-dice-faces")?.value ?? "d4") as DamageDieSize;
            const category = parent.querySelector<HTMLSelectElement>(".add-dice-category")?.value || null;
            const type = (parent.querySelector<HTMLSelectElement>(".add-dice-type")?.value || null) as DamageType;

            if (Number.isNaN(count)) {
                ui.notifications.error("Damage dice count must be a number.");
                return;
            } else if (count < 1) {
                ui.notifications.error("Damage dice count must be greater than zero.");
                return;
            }
            if (!tupleHasValue(["persistent", "precision", "splash", null] as const, category)) {
                ui.notifications.error(`Unkown damage category: ${category}.`);
                return;
            }
            const faceLabel = game.i18n.localize(`PF2E.DamageDie${faces.toUpperCase()}`);
            const label = game.i18n.format("PF2E.Damage.Dialog.Bonus", { dice: `+${count}${faceLabel}` });
            const slug = sluggify(`${label}-${type}`);
            this.dice.push(
                new DamageDicePF2e({
                    label,
                    category,
                    diceNumber: count,
                    dieSize: faces,
                    damageType: type,
                    slug,
                    selector: "damage",
                })
            );
            this.render();
        });

        const rollModeInput = htmlQuery<HTMLSelectElement>(html, "select[name=rollmode]");
        rollModeInput?.addEventListener("change", () => {
            const rollMode = rollModeInput.value;
            if (!tupleHasValue(Object.values(CONST.DICE_ROLL_MODES), rollMode)) {
                throw ErrorPF2e("Unexpected roll mode");
            }
            this.context.rollMode = rollMode;
        });
    }

    /** Show the damage roll dialog and wait for it to close */
    async resolve(): Promise<boolean> {
        this.render(true);
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        this.#resolve?.(this.isRolled);
        super.close(options);
    }

    /** Overriden to add some additional first-render behavior */
    protected override _injectHTML($html: JQuery<HTMLElement>): void {
        super._injectHTML($html);

        // Since this is an initial render, focus the roll button
        $html[0]?.querySelector<HTMLElement>("button.roll")?.focus();
    }
}

interface DamageDialogParams {
    damage: DamageFormulaData;
    context: Partial<DamageRollContext>;
}

interface BaseData {
    label: string;
    enabled: boolean;
    ignored: boolean;
    critical: boolean | null;
    damageType: string | null;
    typeLabel: string | null;
    category: DamageCategoryUnique | string | null;
    categoryIcon: string | null;
    show: boolean;
    icon: string | null;
}

interface DamageDiceData extends BaseData {
    diceLabel: string;
}

interface ModifierData extends BaseData {
    type: string | null;
    modifier: number;
    hideIfDisabled: boolean;
}

interface DamageDialogData {
    appId: string;
    modifiers: ModifierData[];
    dice: DamageDiceData[];
    isCritical: boolean;
    hasVisibleDice: boolean;
    hasVisibleModifiers: boolean;
    damageTypes: typeof CONFIG.PF2E.damageTypes;
    damageSubtypes: Pick<ConfigPF2e["PF2E"]["damageCategories"], DamageCategoryUnique>;
    rollModes: Record<RollMode, string>;
    rollMode: RollMode | "roll" | undefined;
    formula: string;
}

export { DamageModifierDialog };
