import { resetAndRerenderActors } from "@actor/helpers";

const SETTINGS: Record<string, SettingRegistration> = {
    gradualBoostsVariant: {
        name: "PF2E.SETTINGS.Variant.AbilityScore.GradualBoosts.Name",
        hint: "PF2E.SETTINGS.Variant.AbilityScore.GradualBoosts.Hint",
        default: false,
        type: Boolean,
    },
    staminaVariant: {
        name: "PF2E.SETTINGS.Variant.Stamina.Name",
        hint: "PF2E.SETTINGS.Variant.Stamina.Hint",
        default: 0,
        type: Number,
        choices: {
            0: "PF2E.SETTINGS.Variant.Stamina.Choices.0",
            1: "PF2E.SETTINGS.Variant.Stamina.Choices.1", // I plan to expand this, hence the dropdown.
        },
    },
    ancestryParagonVariant: {
        name: "PF2E.SETTINGS.Variant.AncestryParagon.Name",
        hint: "PF2E.SETTINGS.Variant.AncestryParagon.Hint",
        default: 0,
        type: Boolean,
    },
    freeArchetypeVariant: {
        name: "PF2E.SETTINGS.Variant.FreeArchetype.Name",
        hint: "PF2E.SETTINGS.Variant.FreeArchetype.Hint",
        default: 0,
        type: Boolean,
    },
    dualClassVariant: {
        name: "PF2E.SETTINGS.Variant.DualClass.Name",
        hint: "PF2E.SETTINGS.Variant.DualClass.Hint",
        default: 0,
        type: Boolean,
    },
    automaticBonusVariant: {
        name: "PF2E.SETTINGS.Variant.AutomaticBonus.Name",
        hint: "PF2E.SETTINGS.Variant.AutomaticBonus.Hint",
        default: "noABP",
        type: String,
        choices: {
            noABP: "PF2E.SETTINGS.Variant.AutomaticBonus.Choices.noABP",
            ABPFundamentalPotency: "PF2E.SETTINGS.Variant.AutomaticBonus.Choices.ABPFundamentalPotency",
            ABPRulesAsWritten: "PF2E.SETTINGS.Variant.AutomaticBonus.Choices.ABPRulesAsWritten",
        },
        onChange: () => {
            resetAndRerenderActors(game.actors.filter((a) => a.type === "character"));
        },
    },
    proficiencyVariant: {
        name: "PF2E.SETTINGS.Variant.Proficiency.Name",
        hint: "PF2E.SETTINGS.Variant.Proficiency.Hint",
        default: "ProficiencyWithLevel",
        type: String,
        choices: {
            ProficiencyWithLevel: "PF2E.SETTINGS.Variant.Proficiency.Choices.ProficiencyWithLevel",
            ProficiencyWithoutLevel: "PF2E.SETTINGS.Variant.Proficiency.Choices.ProficiencyWithoutLevel",
        },
    },
    proficiencyUntrainedModifier: {
        name: "PF2E.SETTINGS.Variant.UntrainedModifier.Name",
        hint: "PF2E.SETTINGS.Variant.UntrainedModifier.Hint",
        default: 0,
        type: Number,
    },
    proficiencyTrainedModifier: {
        name: "PF2E.SETTINGS.Variant.TrainedModifier.Name",
        hint: "PF2E.SETTINGS.Variant.TrainedModifier.Hint",
        default: 2,
        type: Number,
    },
    proficiencyExpertModifier: {
        name: "PF2E.SETTINGS.Variant.ExpertModifier.Name",
        hint: "PF2E.SETTINGS.Variant.ExpertModifier.Hint",
        default: 4,
        type: Number,
    },
    proficiencyMasterModifier: {
        name: "PF2E.SETTINGS.Variant.MasterModifier.Name",
        hint: "PF2E.SETTINGS.Variant.MasterModifier.Hint",
        default: 6,
        type: Number,
    },
    proficiencyLegendaryModifier: {
        name: "PF2E.SETTINGS.Variant.LegendaryModifier.Name",
        hint: "PF2E.SETTINGS.Variant.LegendaryModifier.Hint",
        default: 8,
        type: Number,
    },
};

export class VariantRulesSettings extends FormApplication {
    static override get defaultOptions(): FormApplicationOptions {
        return {
            ...super.defaultOptions,
            title: "PF2E.SETTINGS.Variant.Title",
            id: "variant-rules-settings",
            template: "systems/pf2e/templates/system/settings/variant-rules-settings.html",
            width: 550,
            height: "auto",
            closeOnSubmit: true,
        };
    }

    override async getData(): Promise<Record<string, { value: unknown; setting: SettingRegistration }>> {
        return Object.entries(SETTINGS).reduce(
            (data: Record<string, { value: unknown; setting: SettingRegistration }>, [key, setting]) => ({
                ...data,
                [key]: { value: game.settings.get("pf2e", key), setting },
            }),
            {}
        );
    }

    static registerSettings(): void {
        for (const [k, v] of Object.entries(SETTINGS)) {
            v.config = false;
            v.scope = "world";
            game.settings.register("pf2e", k, v);
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        $html.find("button[name=reset]").on("click", (event) => this.onResetDefaults(event));
    }

    /**
     * Handle button click to reset default settings
     * @param event The initial button click event
     */
    private async onResetDefaults(event: JQuery.ClickEvent): Promise<this> {
        event.preventDefault();
        for (const [k, v] of Object.entries(SETTINGS)) {
            await game.settings.set("pf2e", k, v?.default);
        }
        return this.render();
    }

    protected override async _onSubmit(
        event: Event,
        options: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        event.preventDefault();
        return super._onSubmit(event, options);
    }

    protected override async _updateObject(_event: Event, data: Record<string, unknown>): Promise<void> {
        for (const key of Object.keys(SETTINGS)) {
            game.settings.set("pf2e", key, data[key]);
        }
    }
}
