import { resetActors } from "@actor/helpers.ts";
import type { SettingRegistration } from "@client/helpers/client-settings.d.mts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import fields = foundry.data.fields;

export class VariantRulesSettings extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = {
        id: "variant-rules-settings",
        window: {
            icon: "fa-solid fa-blender",
            title: "PF2E.SETTINGS.Variant.Title",
            contentTag: "form",
            contentClasses: ["standard-form"],
        },
        position: { width: 560 },
        form: {
            handler: VariantRulesSettings.#onSubmit,
            closeOnSubmit: true,
        },
    };

    static override PARTS = {
        settings: { template: `${SYSTEM_ROOT}/templates/system/settings/variant-rules.hbs` },
        footer: { template: "templates/generic/form-footer.hbs" },
    };

    static #SETTINGS: Record<string, Omit<SettingRegistration, "name" | "type"> & { type: fields.DataField }> = {
        gradualBoostsVariant: {
            type: new fields.BooleanField({
                label: "PF2E.SETTINGS.Variant.GradualBoosts.Name",
                hint: "PF2E.SETTINGS.Variant.GradualBoosts.Hint",
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.gab = !!value;
                resetActors(game.actors.filter((a) => a.type === "character"));
            },
        },
        staminaVariant: {
            type: new fields.BooleanField({
                label: "PF2E.SETTINGS.Variant.Stamina.Name",
                hint: "PF2E.SETTINGS.Variant.Stamina.Hint",
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.stamina = !!value;
                resetActors(game.actors.filter((a) => a.type === "character"));
            },
        },
        freeArchetypeVariant: {
            type: new fields.BooleanField({
                label: "PF2E.SETTINGS.Variant.FreeArchetype.Name",
                hint: "PF2E.SETTINGS.Variant.FreeArchetype.Hint",
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.fa = !!value;
                resetActors(game.actors.filter((a) => a.type === "character"));
            },
        },
        automaticBonusVariant: {
            type: new fields.StringField({
                required: true,
                label: "PF2E.SETTINGS.Variant.AutomaticBonus.Name",
                hint: "PF2E.SETTINGS.Variant.AutomaticBonus.Hint",
                choices: {
                    noABP: "PF2E.SETTINGS.Variant.AutomaticBonus.Choices.noABP",
                    ABPFundamentalPotency: "PF2E.SETTINGS.Variant.AutomaticBonus.Choices.ABPFundamentalPotency",
                    ABPRulesAsWritten: "PF2E.SETTINGS.Variant.AutomaticBonus.Choices.ABPRulesAsWritten",
                },
                initial: "noABP",
            }),
            onChange: (value) => {
                const choices = ["noABP", "ABPFundamentalPotency", "ABPRulesAsWritten"] as const;
                game.pf2e.settings.variants.abp = tupleHasValue(choices, value)
                    ? value
                    : game.pf2e.settings.variants.abp;
                resetActors(game.actors.filter((a) => a.type === "character"));
            },
        },
        mythic: {
            type: new fields.StringField({
                required: true,
                label: "PF2E.SETTINGS.Variant.Mythic.Name",
                hint: "PF2E.SETTINGS.Variant.Mythic.Hint",
                choices: R.mapToObj(["disabled", "enabled", "variant-tiers"], (key) => [
                    key,
                    `PF2E.SETTINGS.Variant.Mythic.Choices.${key}`,
                ]),
                initial: "disabled",
            }),
            onChange: (value) => {
                const choices = ["disabled", "enabled", "variant-tiers"] as const;
                game.pf2e.settings.campaign.mythic = tupleHasValue(choices, value) ? value : "disabled";
                resetActors(game.actors.filter((a) => a.isOfType("character")));
            },
        },
        proficiencyVariant: {
            type: new fields.BooleanField({
                label: "PF2E.SETTINGS.Variant.Proficiency.Name",
                hint: "PF2E.SETTINGS.Variant.Proficiency.Hint",
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.pwol.enabled = !!value;
                resetActors(game.actors.filter((a) => a.type === "character"));
            },
        },
        proficiencyUntrainedModifier: {
            default: -2,
            type: new fields.NumberField({
                label: "PF2E.SETTINGS.Variant.Proficiency.Rank.Untrained",
                required: true,
                nullable: false,
                integer: true,
                initial: -2,
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.pwol.modifiers[0] = Number(value) || 0;
            },
        },
        proficiencyTrainedModifier: {
            type: new fields.NumberField({
                label: "PF2E.SETTINGS.Variant.Proficiency.Rank.Trained",
                required: true,
                nullable: false,
                integer: true,
                initial: 2,
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.pwol.modifiers[1] = Number(value) || 0;
            },
        },
        proficiencyExpertModifier: {
            type: new fields.NumberField({
                label: "PF2E.SETTINGS.Variant.Proficiency.Rank.Expert",
                required: true,
                nullable: false,
                integer: true,
                initial: 4,
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.pwol.modifiers[2] = Number(value) || 0;
            },
        },
        proficiencyMasterModifier: {
            type: new fields.NumberField({
                label: "PF2E.SETTINGS.Variant.Proficiency.Rank.Master",
                required: true,
                nullable: false,
                integer: true,
                initial: 6,
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.pwol.modifiers[3] = Number(value) || 0;
            },
        },
        proficiencyLegendaryModifier: {
            type: new fields.NumberField({
                label: "PF2E.SETTINGS.Variant.Proficiency.Rank.Legendary",
                required: true,
                nullable: false,
                integer: true,
                initial: 8,
            }),
            onChange: (value) => {
                game.pf2e.settings.variants.pwol.modifiers[4] = Number(value) || 0;
            },
        },
    };

    static register(): void {
        game.settings.registerMenu("pf2e", "variantRules", {
            name: "PF2E.SETTINGS.Variant.Name",
            label: "PF2E.SETTINGS.Variant.Label",
            hint: "PF2E.SETTINGS.Variant.Hint",
            icon: "fa-solid fa-blender",
            type: VariantRulesSettings,
            restricted: true,
        });
        for (const [key, data] of Object.entries(VariantRulesSettings.#SETTINGS)) {
            game.settings.register("pf2e", key, { ...data, name: data.type.label, scope: "world", config: false });
        }
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<VariantRulesSettingsContext> {
        const context = await super._prepareContext(options);
        return Object.assign(context, {
            settings: R.mapValues(VariantRulesSettings.#SETTINGS, (v, k) => ({
                ...v,
                value: game.settings.get("pf2e", k),
                pwolModifier: /proficiency[A-Z][a-z]+Modifier/i.test(k),
            })),
            buttons: [
                { type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" },
                { type: "reset", icon: "fa-solid fa-arrow-rotate-left", label: "PF2E.SETTINGS.ResetChanges" },
            ],
            rootId: this.id,
        });
    }

    protected override _onChangeForm(_formConfig: fa.ApplicationFormConfiguration, event: Event): void {
        const pwolCheckbox = this.form?.elements.namedItem("pf2e.proficiencyVariant");
        if (event.target === pwolCheckbox && pwolCheckbox instanceof HTMLInputElement) {
            this.form?.querySelectorAll<HTMLInputElement>("fieldset input[type=number]").forEach((input) => {
                input.disabled = !pwolCheckbox.checked;
            });
        }
    }

    static async #onSubmit(
        this: VariantRulesSettings,
        _event: Event,
        _form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
    ): Promise<void> {
        const submitData = formData.object;
        const promises: Promise<unknown>[] = [];
        for (const key of Object.keys(VariantRulesSettings.#SETTINGS)) {
            const value = submitData[`pf2e.${key}`];
            if (value !== undefined) promises.push(game.settings.set("pf2e", key, value));
        }
        await Promise.all(promises);
    }
}

interface VariantRulesSettingsContext extends fa.ApplicationRenderContext {
    settings: Record<string, SettingRenderData>;
    buttons: fa.FormFooterButton[];
    rootId: string;
}

interface SettingRenderData extends Omit<SettingRegistration, "name" | "type"> {
    type: fields.DataField;
    value: unknown;
    pwolModifier: boolean;
}
