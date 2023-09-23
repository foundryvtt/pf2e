import { MODIFIER_TYPES, ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { RollSubstitution } from "@module/rules/synthetics.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, setHasElement, tupleHasValue } from "@util";
import { RollTwiceOption } from "../rolls.ts";
import { CheckRollContext } from "./types.ts";

/**
 * Dialog for excluding certain modifiers before rolling a check.
 * @category Other
 */
export class CheckModifiersDialog extends Application {
    /** The check which is being edited. */
    check: StatisticModifier;
    /** Relevant context for this roll, like roll options. */
    context: CheckRollContext;
    /** A Promise resolve method */
    resolve: (value: boolean) => void;
    /** Pre-determined D20 roll results */
    substitutions: RollSubstitution[];
    /** Has the promise been resolved? */
    isResolved = false;

    constructor(
        check: StatisticModifier,
        resolve: (value: boolean) => void,
        context: CheckRollContext = { options: new Set() }
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
        this.substitutions = context?.substitutions ?? [];
        this.context = context;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            template: "systems/pf2e/templates/chat/check-modifiers-dialog.hbs",
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
            modifiers: this.check.modifiers,
            totalModifier: this.check.totalModifier,
            rollModes: CONFIG.Dice.rollModes,
            rollMode,
            showRollDialogs: game.user.settings.showRollDialogs,
            substitutions: this.substitutions,
            hasRequiredSubstitution: !!this.substitutions.some((s) => s.required && s.selected),
            fortune,
            none,
            misfortune,
        };
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
                const index = Number(checkbox.dataset.subIndex);
                const substitution = this.substitutions.at(index);
                if (!substitution) return;

                substitution.required = !checkbox.checked;
                const options = (this.context.options ??= new Set());
                const option = `substitute:${substitution.slug}`;

                if (substitution.required) {
                    options.delete(option);
                } else {
                    options.add(option);
                }

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
                this.check.push(new ModifierPF2e(name, value, type));
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

        // Dialog settings menu
        const settingsButton = htmlQuery(htmlClosest(html, ".app"), "a.header-button.settings");
        if (settingsButton && !settingsButton?.dataset.tooltipContent) {
            settingsButton.dataset.tooltipContent = `#${this.id}-settings`;
            const $tooltip = $(settingsButton).tooltipster({
                animation: "fade",
                trigger: "click",
                arrow: false,
                contentAsHTML: true,
                debug: BUILD_MODE === "development",
                interactive: true,
                side: ["top"],
                theme: "crb-hover",
                minWidth: 165,
            });

            const toggle = htmlQuery<HTMLInputElement>(html, ".settings-list input.quick-rolls-submit");
            toggle?.addEventListener("click", async () => {
                await game.user.setFlag("pf2e", "settings.showRollDialogs", toggle.checked);
                $tooltip.tooltipster("close");
            });
        }
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        if (!this.isResolved) this.resolve(false);
        super.close(options);
    }

    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const settingsButton: ApplicationHeaderButton = {
            label: game.i18n.localize("PF2E.SETTINGS.Settings"),
            class: "settings",
            icon: "fa-solid fa-cog",
            onclick: () => null,
        };
        return [settingsButton, ...buttons];
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
    modifiers: readonly ModifierPF2e[];
    totalModifier: number;
    rollModes: Record<RollMode, string>;
    rollMode: RollMode | "roll" | undefined;
    showRollDialogs: boolean;
    substitutions: RollSubstitution[];
    hasRequiredSubstitution: boolean;
    fortune: boolean;
    none: boolean;
    misfortune: boolean;
}
