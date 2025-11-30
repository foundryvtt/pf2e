import { DamageDicePF2e, MODIFIER_TYPES, Modifier, applyStackingRules } from "@actor/modifiers.ts";
import type { RollMode } from "@common/constants.d.mts";
import { DEGREE_OF_SUCCESS, DEGREE_OF_SUCCESS_STRINGS, DegreeOfSuccessIndex } from "@system/degree-of-success.ts";
import {
    ErrorPF2e,
    fontAwesomeIcon,
    htmlQuery,
    htmlQueryAll,
    setHasElement,
    sluggify,
    sortStringRecord,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import { createDamageFormula } from "./formula.ts";
import { getDamageDiceOverrideLabel, getDamageDiceValueLabel } from "./helpers.ts";
import { DamageRoll } from "./roll.ts";
import { DamageCategoryUnique, DamageDamageContext, DamageDieSize, DamageFormulaData, DamageType } from "./types.ts";
import { DAMAGE_CATEGORIES_UNIQUE, DAMAGE_TYPE_ICONS } from "./values.ts";

/**
 * Dialog for excluding certain modifiers before rolling damage.
 * @category Other
 */
class DamageModifierDialog extends fav1.api.Application {
    formulaData: DamageFormulaData;
    context: DamageDamageContext;

    /** The base damage type of this damage roll */
    baseDamageType: DamageType;
    /** Is this critical damage? */
    degree: DegreeOfSuccessIndex;
    /** A Promise resolve method */
    #resolve?: (value: boolean) => void;
    /** Was the roll button pressed? */
    isRolled = false;

    /** A set of originally enabled modifiers and dice to circumvent hideIfDisabled for manual disables */
    #originallyEnabled: {
        modifiers: Set<Modifier>;
        dice: Set<DamageDicePF2e>;
    };

    constructor(params: DamageDialogParams) {
        super();

        this.formulaData = params.formulaData;
        this.context = params.context;
        this.baseDamageType = params.formulaData.base.at(0)?.damageType ?? "untyped";
        this.degree = DEGREE_OF_SUCCESS_STRINGS.indexOf(this.context.outcome ?? "success") as DegreeOfSuccessIndex;

        this.#originallyEnabled = {
            modifiers: new Set(this.formulaData.modifiers.filter((m) => m.enabled)),
            dice: new Set(this.formulaData.dice.filter((d) => d.enabled)),
        };
    }

    static override get defaultOptions(): fav1.api.ApplicationV1Options {
        return {
            ...super.defaultOptions,
            template: `${SYSTEM_ROOT}/templates/chat/damage/damage-modifier-dialog.hbs`,
            classes: ["roll-modifiers-dialog", "damage-dialog", "dialog"],
            popOut: true,
            width: 440,
            height: "auto",
        };
    }

    override get title(): string {
        return this.isCritical
            ? game.i18n.localize("PF2E.Roll.Dialog.Damage.TitleCritical")
            : game.i18n.localize("PF2E.Roll.Dialog.Damage.Title");
    }

    get isCritical(): boolean {
        return this.degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS;
    }

    #getModifierIcon(object: { damageType: DamageType | null; category: DamageCategoryUnique | null }): string {
        const damageTypeIconClass = object.damageType ? DAMAGE_TYPE_ICONS[object.damageType] : null;
        const damageTypeIcon = damageTypeIconClass ? fontAwesomeIcon(damageTypeIconClass) : null;

        const icons = (() => {
            switch (object.category) {
                case "splash":
                    return [fontAwesomeIcon("fa-burst"), damageTypeIcon].filter(R.isTruthy);
                case "persistent":
                    if (object.damageType !== "bleed") {
                        return [damageTypeIcon, fontAwesomeIcon("fa-hourglass", { style: "duotone" })];
                    } else {
                        return [damageTypeIcon];
                    }
                case "precision":
                    return [damageTypeIcon, fontAwesomeIcon("fa-crosshairs")];
                default:
                    return [damageTypeIcon];
            }
        })();

        return icons.map((i) => i?.outerHTML ?? "").join("");
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
                return game.i18n.format("PF2E.Roll.Dialog.Damage.Splash", { damageType: typeLabel });
            default:
                return typeLabel;
        }
    }

    override async getData(): Promise<DamageDialogData> {
        // Separate regular dice and override dice. Unfortunately some dice qualify as both (fatal)
        const visibleModifiers = [...this.formulaData.modifiers.entries()].filter(
            ([_, m]) => this.isCritical || !m.critical,
        );
        const visibleDiceAll = [...this.formulaData.dice.entries()].filter(([_, d]) => this.isCritical || !d.critical);
        const visibleDice = visibleDiceAll.filter(([_, d]) => !d.override || d.dieSize || d.diceNumber);

        // Render base formula
        const baseResult = createDamageFormula({
            base: this.formulaData.base,
            modifiers: [],
            dice: [],
        });
        const baseRoll = new DamageRoll(baseResult.formula);
        const baseFormulaTemplate = (await Promise.all(baseRoll.instances.map((i) => i.render()))).join(" + ");

        // Render final formula
        const result = createDamageFormula(this.formulaData, this.degree);
        const roll = new DamageRoll(result?.formula ?? "0");
        const formulaTemplate = (await Promise.all(roll.instances.map((i) => i.render({ tooltips: false })))).join(
            " + ",
        );

        type DamageDicePF2eWithOverride = DamageDicePF2e & { override: NonNullable<DamageDicePF2e["override"]> };

        return {
            appId: this.id,
            baseFormula: baseFormulaTemplate,
            modifiers: visibleModifiers.map(([idx, m]) => ({
                idx,
                label: m.label,
                category: m.category,
                type: m.type,
                modifier: m.modifier,
                hideIfDisabled: !this.#originallyEnabled.modifiers.has(m) && m.hideIfDisabled,
                damageType: m.damageType,
                typeLabel: this.#getTypeLabel(m.damageType, m.damageCategory),
                enabled: m.enabled,
                ignored: m.ignored,
                critical: m.critical,
                icon: this.#getModifierIcon(m),
            })),
            dice: visibleDice.map(([idx, d]) => ({
                idx,
                label: d.label,
                category: d.category,
                damageType: d.damageType,
                typeLabel: this.#getTypeLabel(d.damageType, d.category),
                hideIfDisabled: !this.#originallyEnabled.dice.has(d) && d.hideIfDisabled,
                diceLabel: getDamageDiceValueLabel(d),
                enabled: d.enabled,
                ignored: d.ignored,
                critical: d.critical,
                icon: this.#getModifierIcon(d),
            })),
            overrides: R.pipe(
                visibleDiceAll,
                R.filter((args): args is [number, DamageDicePF2eWithOverride] => !!args[1].override),
                R.sortBy(([_, d]) => (d.override.diceNumber && !d.override.dieSize ? 1 : d.override.upgrade ? 2 : 3)),
                R.map(([idx, d]) => ({
                    idx,
                    label: d.label,
                    category: d.category,
                    damageType: d.override.damageType ?? d.damageType,
                    hideIfDisabled: !this.#originallyEnabled.dice.has(d) && d.hideIfDisabled,
                    typeLabel: this.#getTypeLabel(d.override.damageType ?? d.damageType, d.category),
                    diceLabel: getDamageDiceOverrideLabel(d),
                    enabled: d.enabled,
                    ignored: d.ignored,
                    critical: d.critical,
                    icon: this.#getModifierIcon({
                        damageType: d.override.damageType ?? d.damageType,
                        category: d.category,
                    }),
                })),
            ),
            isCritical: this.isCritical,
            damageTypes: sortStringRecord(CONFIG.PF2E.damageTypes),
            damageSubtypes: sortStringRecord(R.pick(CONFIG.PF2E.damageCategories, DAMAGE_CATEGORIES_UNIQUE)),
            rollModes: CONFIG.Dice.rollModes,
            rollMode: this.context?.rollMode ?? game.settings.get("core", "rollMode"),
            showDamageDialogs: game.user.settings.showDamageDialogs,
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
                const { dice, modifiers } = this.formulaData;
                const modIndex = Number(checkbox.dataset.modifierIndex);
                const dieIndex = Number(checkbox.dataset.diceIndex);
                if (!Number.isNaN(modIndex)) {
                    modifiers[modIndex].ignored = !checkbox.checked;
                    this.#applyStackingRules();
                } else if (!Number.isNaN(dieIndex)) {
                    dice[dieIndex].ignored = !checkbox.checked;
                    dice[dieIndex].enabled = checkbox.checked;
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
            const category = (parent.querySelector<HTMLSelectElement>(".add-modifier-category")?.value ||
                null) as DamageCategoryUnique;

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

            const label =
                String(parent.querySelector<HTMLInputElement>(".add-modifier-name")?.value).trim() ||
                game.i18n.localize(value < 0 ? `PF2E.PenaltyLabel.${type}` : `PF2E.BonusLabel.${type}`);

            if (errors.length > 0) {
                ui.notifications.error(errors.join(" "));
            } else {
                this.formulaData.modifiers.push(
                    new Modifier({
                        label,
                        modifier: value,
                        type,
                        damageType,
                        damageCategory: category,
                    }),
                );
                this.#applyStackingRules();
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
            const label =
                String(parent.querySelector<HTMLInputElement>(".add-dice-name")?.value).trim() ||
                game.i18n.format("PF2E.Roll.Dialog.Damage.ExtraDice");
            const slug = sluggify(`${label}-${type}`);
            this.formulaData.dice.push(
                new DamageDicePF2e({
                    label,
                    category,
                    diceNumber: count,
                    dieSize: faces,
                    damageType: type,
                    slug,
                    selector: "damage",
                }),
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

        // Toggle show dialog default
        const toggle = htmlQuery<HTMLInputElement>(html, "input[data-action=change-show-default]");
        toggle?.addEventListener("click", async () => {
            await game.user.update({ "flags.pf2e.settings.showDamageDialogs": toggle.checked });
        });
    }

    /** Apply stacking rules to the current set of modifiers, splitting by persistent/not-persistent */
    #applyStackingRules() {
        applyStackingRules(this.formulaData.modifiers.filter((m) => m.category !== "persistent"));
        applyStackingRules(this.formulaData.modifiers.filter((m) => m.category === "persistent"));
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
    formulaData: DamageFormulaData;
    context: DamageDamageContext;
}

interface BaseData {
    idx: number;
    label: string;
    enabled: boolean;
    ignored: boolean;
    critical: boolean | null;
    damageType: string | null;
    typeLabel: string | null;
    category: DamageCategoryUnique | string | null;
    icon: string;
}

interface DialogDiceData extends BaseData {
    diceLabel: string;
}

interface ModifierData extends BaseData {
    type: string | null;
    modifier: number;
    hideIfDisabled: boolean;
}

interface DamageDialogData {
    appId: string;
    baseFormula: string;
    modifiers: ModifierData[];
    dice: DialogDiceData[];
    overrides: DialogDiceData[];
    isCritical: boolean;
    damageTypes: typeof CONFIG.PF2E.damageTypes;
    damageSubtypes: Pick<ConfigPF2e["PF2E"]["damageCategories"], DamageCategoryUnique>;
    rollModes: Record<RollMode, string>;
    rollMode: RollMode | "roll" | undefined;
    showDamageDialogs: boolean;
    formula: string;
}

export { DamageModifierDialog };
