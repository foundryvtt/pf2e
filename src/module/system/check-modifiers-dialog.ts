import { ModifierPF2e, StatisticModifier } from "../actor/modifiers";
import { CheckRollContext, RollTwiceOption } from "./rolls";
import { LocalizePF2e } from "./localize";
import { RollSubstitution } from "@module/rules/rule-element/data";

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

    constructor(check: StatisticModifier, resolve: (value: boolean) => void, context?: CheckRollContext) {
        super({
            title: context?.title || check.name,
            template: "systems/pf2e/templates/chat/check-modifiers-dialog.html",
            classes: ["dice-checks", "dialog"],
            popOut: true,
            width: 380,
            height: "auto",
        });

        this.check = check;
        this.context = context ?? {}; // might include a reference to actor, so do not do mergeObject or similar
        this.resolve = resolve;
        this.substitutions = context?.substitutions ?? [];
        if (this.context.secret) {
            this.context.rollMode = "blindroll";
        } else {
            this.context.rollMode ??= game.settings.get("core", "rollMode");
        }
    }

    override getData(): object {
        const fortune = this.context.rollTwice === "keep-higher";
        const misfortune = this.context.rollTwice === "keep-lower";
        const none = fortune === misfortune;
        return {
            appId: this.id,
            modifiers: this.check.modifiers.filter((m) => m.enabled || !m.hideIfDisabled),
            totalModifier: this.check.totalModifier,
            rollModes: CONFIG.Dice.rollModes,
            rollMode: this.context.rollMode,
            showRollDialogs: game.user.settings.showRollDialogs,
            substitutions: this.substitutions,
            fortune,
            none,
            misfortune,
        };
    }

    override activateListeners($html: JQuery): void {
        $html.find(".roll").on("click", () => {
            this.resolve(true);
            this.isResolved = true;
            this.close();
        });

        $html.find<HTMLInputElement>(".substitutions input[type=checkbox]").on("click", (event) => {
            const checkbox = event.currentTarget;
            const index = Number(checkbox.dataset.subIndex);
            const substitution = this.substitutions.at(index);
            if (!substitution) return;

            substitution.ignored = !checkbox.checked;
            if (substitution.ignored) {
                this.context.options?.findSplice((o) => o === `substitute:${substitution.slug}`);
            } else {
                this.context.options?.push(`substitute:${substitution.slug}`);
            }

            this.check.calculateTotal(this.context.options);
            this.render();
        });

        $html.find<HTMLInputElement>(".modifier-container input[type=checkbox]").on("click", (event) => {
            const checkbox = event.currentTarget;
            const index = Number(checkbox.dataset.modifierIndex);
            this.check.modifiers[index].ignored = !checkbox.checked;
            this.check.calculateTotal();
            this.render();
        });

        $html.find(".add-modifier-panel").on("click", ".add-modifier", (event) => this.onAddModifier(event));

        $html.find<HTMLInputElement>(".fate input[type=radio]").on("click", (event) => {
            this.context.rollTwice = (event.currentTarget.value || false) as RollTwiceOption;
        });

        $html.find("[name=rollmode]").on("change", (event) => this.onChangeRollMode(event));

        // Dialog settings menu
        const $settings = $html.closest(`#${this.id}`).find("a.header-button.settings");
        const $tooltip = $settings.attr({ "data-tooltip-content": `#${this.id}-settings` }).tooltipster({
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
        $html.find<HTMLInputElement>(".settings-list input.quick-rolls-submit").on("change", async (event) => {
            const $checkbox = $(event.delegateTarget);
            await game.user.setFlag("pf2e", "settings.showRollDialogs", $checkbox[0].checked);
            $tooltip.tooltipster("close");
        });
    }

    override async close(options?: { force?: boolean }): Promise<void> {
        if (!this.isResolved) this.resolve(false);
        super.close(options);
    }

    async onAddModifier(event: JQuery.ClickEvent): Promise<void> {
        const parent = $(event.currentTarget).parents(".add-modifier-panel");
        const value = Number(parent.find(".add-modifier-value").val());
        const type = `${parent.find(".add-modifier-type").val()}`;
        let name = `${parent.find(".add-modifier-name").val()}`;
        const errors: string[] = [];
        if (Number.isNaN(value)) {
            errors.push("Modifier value must be a number.");
        } else if (value === 0) {
            errors.push("Modifier value must not be zero.");
        }
        if (!type || !type.trim().length) {
            errors.push("Modifier type is required.");
        }
        if (!name || !name.trim()) {
            name = game.i18n.localize(value < 0 ? `PF2E.PenaltyLabel.${type}` : `PF2E.BonusLabel.${type}`);
        }
        if (errors.length > 0) {
            ui.notifications.error(errors.join(" "));
        } else {
            this.check.push(new ModifierPF2e(name, value, type));
            await this.render();
        }
    }

    onChangeRollMode(event: JQuery.ChangeEvent): void {
        this.context.rollMode = ($(event.currentTarget).val() ?? "publicroll") as RollMode;
    }

    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const label = LocalizePF2e.translations.PF2E.SETTINGS.Settings;
        const settingsButton: ApplicationHeaderButton = {
            label,
            class: `settings`,
            icon: "fas fa-cog",
            onclick: () => null,
        };
        return [settingsButton, ...buttons];
    }
}
