import { resetActors } from "@actor/helpers.ts";
import { htmlQuery } from "@util";

const SETTINGS: Record<string, SettingRegistration> = {
    gradualBoostsVariant: {
        name: "PF2E.SETTINGS.Variant.GradualBoosts.Name",
        hint: "PF2E.SETTINGS.Variant.GradualBoosts.Hint",
        default: false,
        type: Boolean,
    },
    staminaVariant: {
        name: "PF2E.SETTINGS.Variant.Stamina.Name",
        hint: "PF2E.SETTINGS.Variant.Stamina.Hint",
        default: false,
        type: Boolean,
        onChange: () => {
            resetActors(game.actors.filter((a) => a.type === "character"));
        },
    },
    ancestryParagonVariant: {
        name: "PF2E.SETTINGS.Variant.AncestryParagon.Name",
        hint: "PF2E.SETTINGS.Variant.AncestryParagon.Hint",
        default: false,
        type: Boolean,
        onChange: () => {
            resetActors(game.actors.filter((a) => a.type === "character"));
        },
    },
    freeArchetypeVariant: {
        name: "PF2E.SETTINGS.Variant.FreeArchetype.Name",
        hint: "PF2E.SETTINGS.Variant.FreeArchetype.Hint",
        default: false,
        type: Boolean,
        onChange: () => {
            resetActors(game.actors.filter((a) => a.type === "character"));
        },
    },
    dualClassVariant: {
        name: "PF2E.SETTINGS.Variant.DualClass.Name",
        hint: "PF2E.SETTINGS.Variant.DualClass.Hint",
        default: false,
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
            resetActors(game.actors.filter((a) => a.type === "character"));
        },
    },
    proficiencyVariant: {
        name: "PF2E.SETTINGS.Variant.Proficiency.Name",
        hint: "PF2E.SETTINGS.Variant.Proficiency.Hint",
        default: false,
        type: Boolean,
        onChange: () => {
            resetActors(game.actors.filter((a) => a.type === "character"));
        },
    },
    proficiencyUntrainedModifier: {
        name: "PF2E.SETTINGS.Variant.UntrainedModifier.Name",
        hint: "PF2E.SETTINGS.Variant.UntrainedModifier.Hint",
        default: -2,
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
            template: "systems/pf2e/templates/system/settings/variant-rules.hbs",
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
            {},
        );
    }

    static registerSettings(): void {
        for (const [key, value] of Object.entries(SETTINGS)) {
            value.config = false;
            value.scope = "world";
            game.settings.register("pf2e", key, value);
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        htmlQuery($html[0], "button[name=reset]")?.addEventListener("click", async (event) => {
            event.preventDefault();
            for (const [key, value] of Object.entries(SETTINGS)) {
                await game.settings.set("pf2e", key, value?.default);
            }
            return this.render();
        });
    }

    protected override async _updateObject(_event: Event, data: Record<string, unknown>): Promise<void> {
        for (const key of Object.keys(SETTINGS)) {
            game.settings.set("pf2e", key, data[key]);
        }
    }
}
