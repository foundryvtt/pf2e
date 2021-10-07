import { MODIFIER_TYPE, ModifierPF2e, StatisticModifier } from "../modifiers";
import { CheckModifiersContext } from "./rolls";
import { LocalizePF2e } from "./localize";

/**
 * Dialog for excluding certain modifiers before rolling a check.
 * @category Other
 */
export class CheckModifiersDialog extends Application {
    /** The check which is being edited. */
    check: StatisticModifier;
    /** Relevant context for this roll, like roll options. */
    context: CheckModifiersContext;
    /** A Promise resolve method */
    resolve: (value: boolean) => void;
    /** Has the promise been resolved? */
    isResolved = false;

    constructor(check: StatisticModifier, resolve: (value: boolean) => void, context?: CheckModifiersContext) {
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
        if (this.context.secret) {
            this.context.rollMode = "blindroll";
        } else {
            this.context.rollMode = game.settings.get("core", "rollMode") ?? "roll";
        }

        CheckModifiersDialog.checkAssurance(check, this.context);
    }

    override getData() {
        const fortune = this.context.fate === "fortune";
        const misfortune = this.context.fate === "misfortune";
        const assurance = this.context.fate === "assurance";
        const override = this.context.fate === "override";

        const none = !fortune && !misfortune && !assurance && !override;

        const fateOverride: number = +(this?.context?.fateOverride ?? 10);

        return {
            appId: this.id,
            check: this.check,
            rollModes: CONFIG.Dice.rollModes,
            rollMode: this.context.rollMode,
            showRollDialogs: game.user.settings.showRollDialogs,
            fate: {
                fortune: fortune,
                misfortune: misfortune,
                assurance: assurance,
                override: override,
                overrideValue: fateOverride,
                none: none,
            },
            assuranceAllowed: this?.context?.type === "skill-check",
        };
    }

    /**
     * If the fate condition is "assurance" then auto-disable all non-proficiency bonuses. Using the "autoIgnored"
     * rather "ignored" means that, if the fate is changed from "assurance", the previously-enabled modifiers will
     * be automatically re-enabled.
     */
    static checkAssurance(check: StatisticModifier, context: CheckModifiersContext) {
        const isAssurance = context.fate === "assurance";
        check.modifiers
            .filter((m) => m.type !== MODIFIER_TYPE.PROFICIENCY)
            .forEach((m) => (m.autoIgnored = isAssurance));
        check.applyStackingRules();
    }

    override activateListeners(html: JQuery) {
        html.find(".roll").on("click", (_event) => {
            this.resolve(true);
            this.isResolved = true;
            this.close();
        });

        html.find(".modifier-container").on("click", "input[type=checkbox]", (event) => {
            const index = Number(event.currentTarget.getAttribute("data-modifier-index"));
            this.check.modifiers[index].ignored = event.currentTarget.checked;
            this.check.applyStackingRules();
            this.render();
        });

        html.find(".add-modifier-panel").on("click", ".add-modifier", (event) => this.onAddModifier(event));
        html.find("[name=rollmode]").on("change", (event) => this.onChangeRollMode(event));
        html.find(".fate")
            .on("click", "input[type=radio]", (event) => this.onChangeFate(event))
            .on("input", "input[type=number]", (event) => this.onChangeFateOverride(event));

        // Dialog settings menu
        const $settings = html.closest(`#${this.id}`).find("a.header-button.settings");
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
        html.find<HTMLInputElement>(".settings-list input.quick-rolls-submit").on("change", async (event) => {
            const $checkbox = $(event.delegateTarget);
            await game.user.setFlag("pf2e", "settings.showRollDialogs", $checkbox[0].checked);
            $tooltip.tooltipster("close");
        });
    }

    override async close(options?: { force?: boolean }) {
        if (!this.isResolved) this.resolve(false);
        super.close(options);
    }

    onAddModifier(event: JQuery.ClickEvent) {
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
            this.render();
        }
    }

    onChangeRollMode(event: JQuery.ChangeEvent) {
        this.context.rollMode = ($(event.currentTarget).val() ?? "roll") as RollMode;
    }

    onChangeFate(event: JQuery.ClickEvent) {
        this.context.fate = event.currentTarget.getAttribute("value");
        if (
            this.context.fate === "assurance" ||
            (this.context.fate === "override" && this.context.fateOverride === undefined)
        ) {
            this.context.fateOverride = 10;
        }

        CheckModifiersDialog.checkAssurance(this.check, this.context);
        this.render();
    }

    onChangeFateOverride(event: JQuery.TriggeredEvent) {
        let fateOverride = event.currentTarget.value;
        let refresh = false;

        if (fateOverride % 1 !== 0) {
            fateOverride = Math.floor(fateOverride);
            refresh = true;
        }

        if (fateOverride < 1 || fateOverride > 20) {
            fateOverride = Math.clamped(fateOverride, 1, 20);
            refresh = true;
        }

        this.context.fateOverride = fateOverride;
        if (refresh) {
            this.render();
        }
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
