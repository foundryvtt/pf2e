import { MODIFIER_TYPES, Modifier, RawModifier, StatisticModifier } from "@actor/modifiers.ts";
import type { ApplicationV1Options } from "@client/appv1/api/application-v1.d.mts";
import type { RollMode } from "@common/constants.d.mts";
import type { RollSubstitution } from "@module/rules/synthetics.ts";
import { ErrorPF2e, htmlQuery, htmlQueryAll, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";
import type { RollTwiceOption } from "../rolls.ts";
import type { CheckCheckContext } from "./types.ts";

/**
 * Dialog for excluding certain modifiers before rolling a check.
 * @category Other
 */
export class CheckModifiersDialog extends fav1.api.Application {
    /** The check which is being edited. */
    check: StatisticModifier;
    /** Relevant context for this roll, like roll options. */
    context: CheckCheckContext;
    /** A Promise resolve method */
    resolve: (value: boolean) => void;
    /** Has the promise been resolved? */
    isResolved = false;

    /** A set of originally enabled modifiers to circumvent hideIfDisabled for manual disables */
    #originallyEnabled: Set<Modifier>;

    constructor(
        check: StatisticModifier,
        resolve: (value: boolean) => void,
        context: CheckCheckContext = { options: new Set() },
    ) {
        // The title often has HTML in it: get the base text
        const title = ((): string => {
            const maybeWithHTML = context.title?.trim() || check.slug;
            if (!maybeWithHTML.includes("<")) return maybeWithHTML.trim();

            const div = document.createElement("div");
            div.innerHTML = maybeWithHTML;
            div.querySelector(".action-glyph, .pf2-icon")?.remove();

            return div.innerText.trim();
        })();

        super({ title });

        this.check = check;
        this.resolve = resolve;
        this.context = context;

        this.#originallyEnabled = new Set(check.modifiers.filter((m) => m.enabled));
    }

    static override get defaultOptions(): ApplicationV1Options {
        return {
            ...super.defaultOptions,
            template: `${SYSTEM_ROOT}/templates/chat/check-modifiers-dialog.hbs`,
            classes: ["roll-modifiers-dialog", "dice-checks", "dialog"],
            popOut: true,
            width: 380,
            height: "auto",
        };
    }

    override async getData(): Promise<CheckDialogData> {
        const fortune = this.context.rollTwice === "keep-higher";
        const misfortune = this.context.rollTwice === "keep-lower";
        const none = fortune === misfortune;
        const rollMode =
            this.context.rollMode === "roll" ? game.settings.get("core", "rollMode") : this.context.rollMode;

        return {
            appId: this.id,
            modifiers: this.check.modifiers.map((m) => ({
                ...m,
                hideIfDisabled: !this.#originallyEnabled.has(m) && m.hideIfDisabled,
            })),
            totalModifier: this.check.totalModifier,
            rollModes: CONFIG.Dice.rollModes,
            rollMode,
            showCheckDialogs: game.user.settings.showCheckDialogs,
            substitutions: this.#resolveSubstitutions(),
            fortune,
            none,
            misfortune,
        };
    }

    #resolveSubstitutions(): RollSubstitutionDialogData[] {
        this.context.substitutions ??= [];
        const hasRequired = {
            fortune: this.context.substitutions.some((s) => s.required && s.effectType === "fortune"),
            misfortune: this.context.substitutions.some((s) => s.required && s.effectType === "misfortune"),
        };

        return this.context.substitutions.map((substitution) => {
            const toggleable = !hasRequired[substitution.effectType];
            const selected = substitution.required ? true : substitution.selected && toggleable;
            return { ...substitution, selected, toggleable };
        });
    }

    override activateListeners($html: JQuery): void {
        const html = $html[0];

        htmlQuery<HTMLButtonElement>(html, "button.roll")?.addEventListener("click", () => {
            this.resolve(true);
            this.isResolved = true;
            this.close();
        });

        for (const checkbox of htmlQueryAll<HTMLInputElement>(html, ".substitutions input[type=checkbox]")) {
            checkbox.addEventListener("click", () => {
                const substitutions = this.context.substitutions ?? [];
                const index = Number(checkbox.dataset.subIndex);
                const toggledSub = substitutions.at(index);
                if (!toggledSub) return;

                toggledSub.selected = toggledSub.required || checkbox.checked;
                const options = (this.context.options ??= new Set());

                for (const substitution of substitutions) {
                    const option = `substitute:${substitution.slug}`;
                    if (substitution.selected) {
                        options.add(option);
                    } else {
                        options.delete(option);
                    }
                }
                this.context.substitutions = this.#resolveSubstitutions().map((s) => R.omit(s, ["toggleable"]));

                this.check.calculateTotal(this.context.options);
                this.render();
            });
        }

        for (const checkbox of htmlQueryAll<HTMLInputElement>(html, ".modifier-container input[type=checkbox]")) {
            checkbox.addEventListener("click", () => {
                const index = Number(checkbox.dataset.modifierIndex);
                this.check.modifiers[index].ignored = !checkbox.checked;
                this.check.calculateTotal();
                this.render();
            });
        }

        const addModifierButton = htmlQuery<HTMLButtonElement>(html, "button.add-modifier");
        addModifierButton?.addEventListener("click", () => {
            const parent = addModifierButton.parentElement as HTMLDivElement;
            const value = Number(parent.querySelector<HTMLInputElement>(".add-modifier-value")?.value || 1);
            const type = String(parent.querySelector<HTMLSelectElement>(".add-modifier-type")?.value);
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
                this.check.push(new Modifier(name, value, type));
                this.render();
            }
        });

        for (const rollTwice of htmlQueryAll<HTMLInputElement>(html, ".fate input[type=radio]")) {
            rollTwice.addEventListener("click", () => {
                this.context.rollTwice = (rollTwice.value || false) as RollTwiceOption;
            });
        }

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
            await game.user.update({ "flags.pf2e.settings.showCheckDialogs": toggle.checked });
        });
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        if (!this.isResolved) this.resolve(false);
        super.close(options);
    }

    /** Overriden to add some additional first-render behavior */
    protected override _injectHTML($html: JQuery<HTMLElement>): void {
        super._injectHTML($html);

        // Since this is an initial render, focus the roll button
        $html[0]?.querySelector<HTMLElement>("button.roll")?.focus();
    }
}

interface CheckDialogData {
    appId: string;
    modifiers: RawModifier[];
    totalModifier: number;
    rollModes: Record<RollMode, string>;
    rollMode: RollMode | "roll" | undefined;
    showCheckDialogs: boolean;
    substitutions: RollSubstitutionDialogData[];
    fortune: boolean;
    none: boolean;
    misfortune: boolean;
}

interface RollSubstitutionDialogData extends RollSubstitution {
    toggleable: boolean;
}
