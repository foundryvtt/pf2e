import { MODIFIER_TYPES, ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { RollSubstitution } from "@module/rules/synthetics.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, setHasElement, tupleHasValue } from "@util";
import { RollTwiceOption } from "../rolls.ts";
import { CheckRollContext } from "./types.ts";
import { RecallKnowledgeContextData } from "@module/recall-knowledge.ts";
import {
    DCAdjustment,
    adjustDC,
    calculateDC,
    calculateSimpleDC,
    combineDCAdjustments,
    rarityToDCAdjustment,
} from "@module/dc.ts";
import { Rarity } from "@module/data.ts";
import { ProficiencyRank } from "@item/data/index.ts";

/**
 * Dialog for excluding certain modifiers before rolling a check.
 * @category Other
 */
export class CheckModifiersDialog extends Application {
    /** The check which is being edited. */
    check: StatisticModifier;
    /** Relevant context for this roll, like roll options. */
    context: CheckRollContext;
    /** */
    recallKnowledge: RecallKnowledgeContextData | null;
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
        this.recallKnowledge = context.recallKnowledge ?? null;
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
        const simpleDCs = ["untrained", "trained", "expert", "master", "legendary"];
        const levelBasedDCs = [
            -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
        ];

        return {
            appId: this.id,
            modifiers: this.check.modifiers,
            totalModifier: this.check.totalModifier,
            rollModes: CONFIG.Dice.rollModes,
            rollMode,
            showRollDialogs: game.user.settings.showRollDialogs,
            recallKnowledge: this.recallKnowledge,
            levelBasedDCs,
            simpleDCs,
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
            if (this.context?.recallKnowledge && this.context.dc)
                this.context.dc.value = adjustDC(
                    adjustDC(
                        this.context.dc.value,
                        combineDCAdjustments(
                            rarityToDCAdjustment(this.context.recallKnowledge.rarity),
                            this.context.recallKnowledge.applicableLore as DCAdjustment
                        )
                    ),
                    this.context.recallKnowledge.difficulty
                );
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

        for (const recallKnowledgeLore of htmlQueryAll<HTMLInputElement>(
            html,
            ".recall-knowledge-lore-panel input[type=radio]"
        )) {
            recallKnowledgeLore.addEventListener("click", () => {
                this.context.recallKnowledge!.applicableLore = recallKnowledgeLore.value;
            });
        }

        for (const recallKnowledgeRarity of htmlQueryAll<HTMLInputElement>(
            html,
            ".recall-knowledge-rarity-panel input[type=radio]"
        )) {
            recallKnowledgeRarity.addEventListener("click", () => {
                this.context.recallKnowledge!.rarity = recallKnowledgeRarity.value as Rarity;
            });
        }

        for (const recallKnowledgeDifficulty of htmlQueryAll<HTMLInputElement>(
            html,
            ".recall-knowledge-difficulty-panel input[type=radio]"
        )) {
            recallKnowledgeDifficulty.addEventListener("click", () => {
                this.context.recallKnowledge!.difficulty = recallKnowledgeDifficulty.value as DCAdjustment;
            });
        }

        const simpleDC = htmlQuery<HTMLSelectElement>(html, "select[name=simple-dcs]");
        simpleDC?.addEventListener("change", () => {
            if (
                htmlQuery<HTMLInputElement>(html, ".recall-knowledge-no-target input[type=radio]:checked")?.value ===
                "simple-dc"
            )
                this.context.dc!.value = calculateSimpleDC(simpleDC.value as ProficiencyRank);
        });

        const levelBasedDC = htmlQuery<HTMLSelectElement>(html, "select[name=level-based-dcs]");
        levelBasedDC?.addEventListener("change", () => {
            if (
                htmlQuery<HTMLInputElement>(html, ".recall-knowledge-no-target input[type=radio]:checked")?.value ===
                "level-based-dc"
            )
                this.context.dc!.value = calculateDC(parseInt(levelBasedDC.value));
        });

        for (const recallKnowledgeManualDCButton of htmlQueryAll<HTMLInputElement>(
            html,
            ".recall-knowledge-no-target input[type=radio]"
        )) {
            recallKnowledgeManualDCButton.addEventListener("click", () => {
                this.context.dc!.value =
                    recallKnowledgeManualDCButton.getAttribute("value") === "simple-dc"
                        ? calculateSimpleDC(simpleDC?.value as ProficiencyRank)
                        : calculateDC(parseInt(levelBasedDC!.value));
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
    recallKnowledge: RecallKnowledgeContextData | null;
    rollModes: Record<RollMode, string>;
    rollMode: RollMode | "roll" | undefined;
    showRollDialogs: boolean;
    substitutions: RollSubstitution[];
    hasRequiredSubstitution: boolean;
    fortune: boolean;
    none: boolean;
    misfortune: boolean;
    levelBasedDCs: number[];
    simpleDCs: string[];
}
