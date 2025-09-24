import type { ApplicationConfiguration, FormFooterButton } from "@client/applications/_module.d.mts";
import type { FormDataExtended } from "@client/applications/ux/_module.d.mts";
import * as R from "remeda";
import fields = foundry.data.fields;

interface SettingsContext extends fa.ApplicationRenderContext {
    rootId: string;
    fields: WorldClockSettingSchema;
    settings: WorldClockSettingData;
    dateThemes: Record<string, string>;
    timeConventions: Record<12 | 24, string>;
    buttons: FormFooterButton[];
}

type WorldClockSettingSchema = {
    dateTheme: fields.StringField<"AR" | "IC" | "AD" | "CE", "AR" | "IC" | "AD" | "CE", true, false, true>;
    playersCanView: fields.BooleanField;
    showClockButton: fields.BooleanField;
    syncDarkness: fields.BooleanField;
    timeConvention: fields.NumberField<12 | 24, 12 | 24, true, false, true>;
    worldCreatedOn: fields.StringField<string, string, true, true, true>;
};

export interface WorldClockSettingData extends fields.SourceFromSchema<WorldClockSettingSchema> {}

export class WorldClockSettings extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    constructor(options?: DeepPartial<ApplicationConfiguration>) {
        super(options);
    }

    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        id: "world-clock-settings",
        tag: "form",
        window: {
            title: "PF2E.SETTINGS.WorldClock.Name",
            icon: "fa-solid fa-clock",
            contentClasses: ["standard-form"],
        },
        position: { width: 560 },
        actions: {
            resetWorldTime: WorldClockSettings.#onClickResetWorldTime,
        },
        form: {
            closeOnSubmit: true,
            handler: WorldClockSettings.#onSubmit,
        },
    };

    static override PARTS = {
        settings: { template: "systems/pf2e/templates/system/settings/world-clock/settings.hbs", root: true },
        footer: { template: "templates/generic/form-footer.hbs" },
    };

    static #SCHEMA: fields.SchemaField<WorldClockSettingSchema> = new fields.SchemaField({
        dateTheme: new fields.StringField({ required: true, choices: ["AR", "IC", "AD", "CE"], initial: "AR" }),
        playersCanView: new fields.BooleanField(),
        showClockButton: new fields.BooleanField({ initial: true }),
        syncDarkness: new fields.BooleanField(),
        timeConvention: new fields.NumberField({ required: true, nullable: false, choices: [12, 24], initial: 24 }),
        worldCreatedOn: new fields.StringField({ required: true, nullable: true, blank: false, initial: null }),
    });

    /** Register World Clock settings and this menu. */
    static registerSettings(): void {
        game.settings.register("pf2e", "worldClock", {
            name: "PF2E.SETTINGS.WorldClock.Name",
            scope: "world",
            config: false,
            type: WorldClockSettings.#SCHEMA,
            onChange: (data) => {
                game.pf2e.settings.worldClock = { ...(data as WorldClockSettingData) };
            },
        });
        game.settings.registerMenu("pf2e", "worldClock", {
            name: "PF2E.SETTINGS.WorldClock.Name",
            label: "PF2E.SETTINGS.WorldClock.Label",
            hint: "PF2E.SETTINGS.WorldClock.Hint",
            icon: "fa-solid fa-clock",
            type: WorldClockSettings,
            restricted: true,
        });
    }

    static localizeSchema(): void {
        fh.Localization.localizeSchema(WorldClockSettings.#SCHEMA, ["PF2E.SETTINGS.WorldClock"], {
            prefixPath: "pf2e.worldClock.",
        });
    }

    override async _prepareContext(): Promise<SettingsContext> {
        const buttons = [
            { type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" },
            {
                type: "button",
                icon: "fa-solid fa-clock-rotate-left",
                label: "PF2E.SETTINGS.WorldClock.ResetWorldTime.Label",
                tooltip: "PF2E.SETTINGS.WorldClock.ResetWorldTime.Hint",
                action: "resetWorldTime",
            },
        ];
        return {
            rootId: this.id,
            fields: WorldClockSettings.#SCHEMA.fields,
            settings: game.pf2e.settings.worldClock,
            dateThemes: R.mapToObj(["AR", "IC", "AD", "CE"], (k) => [
                k,
                game.i18n.localize(`PF2E.SETTINGS.WorldClock.DateThemes.${k}`),
            ]),
            timeConventions: {
                12: game.i18n.localize("PF2E.SETTINGS.WorldClock.TimeConventions.12"),
                24: game.i18n.localize("PF2E.SETTINGS.WorldClock.TimeConventions.24"),
            },
            buttons,
        };
    }

    static async #onClickResetWorldTime(this: WorldClockSettings): Promise<void> {
        const templatePath = "systems/pf2e/templates/system/settings/world-clock/confirm-reset.hbs";
        const content = await fa.handlebars.renderTemplate(templatePath);
        fa.api.DialogV2.confirm({
            window: { title: "PF2E.SETTINGS.WorldClock.ResetWorldTime.Label" },
            content,
            yes: {
                callback: () => {
                    game.time.advance(-1 * game.time.worldTime);
                    this.close();
                },
            },
            no: { default: true },
        });
    }

    static async #onSubmit(
        this: WorldClockSettings,
        _event: Event,
        _form: HTMLFormElement,
        formData: FormDataExtended,
    ): Promise<void> {
        const update = {
            ...fu.expandObject<{ pf2e: { worldClock: WorldClockSettingData } }>(formData.object).pf2e.worldClock,
            worldCreatedOn: game.pf2e.settings.worldClock.worldCreatedOn,
        };
        await game.settings.set("pf2e", "worldClock", update);
        game.pf2e.worldClock.render();
    }
}
