import { ModifierPF2e, StatisticModifier } from "../modifiers";
import { ActorPF2e } from "@actor/base";
import { RollNotePF2e } from "../notes";
import { PF2CheckDC } from "./check-degree-of-success";
import { LocalizePF2e } from "./localize";
import { ItemPF2e } from "@item";

export interface CheckModifiersContext {
    /** Any options which should be used in the roll. */
    options?: string[];
    /** Any notes which should be shown for the roll. */
    notes?: RollNotePF2e[];
    /** If true, this is a secret roll which should only be seen by the GM. */
    secret?: boolean;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: string;
    /** Should this roll be rolled with 'fortune' (2 dice, keep higher) or 'misfortune' (2 dice, keep lower)? */
    fate?: string;
    /** The actor which initiated this roll. */
    actor?: ActorPF2e;
    /** The originating item of this attack, if any */
    item?: Embedded<ItemPF2e> | null;
    /** Optional title of the roll options dialog; defaults to the check name */
    title?: string;
    /** The type of this roll, like 'perception-check' or 'saving-throw'. */
    type?: string;
    /** Any traits for the check. */
    traits?: string[];
    /** Optional DC data for the check */
    dc?: PF2CheckDC;
    /** Should the roll be immediately created as a chat message? */
    createMessage?: boolean;
    /** Skip the roll dialog regardless of user setting  */
    skipDialog?: boolean;
    /** Is the roll a reroll? */
    isReroll?: boolean;
}

/**
 * Dialog for excluding certain modifiers before rolling a check.
 * @category Other
 */
export class CheckModifiersDialog extends Application {
    /** The check which is being edited. */
    check: StatisticModifier;
    /** Relevant context for this roll, like roll options. */
    context: CheckModifiersContext;
    /** Promise resolve function */
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
    }

    override getData() {
        const fortune = this.context.fate === "fortune";
        const misfortune = this.context.fate === "misfortune";
        const none = fortune === misfortune;
        return {
            appId: this.id,
            check: this.check,
            rollModes: CONFIG.Dice.rollModes,
            rollMode: this.context.rollMode,
            showRollDialogs: game.user.settings.showRollDialogs,
            fortune,
            none,
            misfortune,
        };
    }

    override activateListeners(html: JQuery) {
        html.find(".roll").on("click", (_event) => {
            this.context.fate = html.find("input[type=radio][name=fate]:checked").val() as string;
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
        this.context.rollMode = ($(event.currentTarget).val() ?? "roll") as string;
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
