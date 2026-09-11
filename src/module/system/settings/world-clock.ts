import type { ApplicationConfiguration, FormFooterButton } from "@client/applications/_module.d.mts";
import type { FormDataExtended } from "@client/applications/ux/_module.d.mts";
import { ErrorPF2e } from "@util";
import type { HourNumbers, MinuteNumbers } from "luxon";
import * as R from "remeda";

import fields = foundry.data.fields;

interface SettingsContext extends fa.ApplicationRenderContext {
    rootId: string;
    fields: WorldClockSettingSchema;
    settings: WorldClockSettingData;
    dateThemes: Record<string, string>;
    timeConventions: Record<12 | 24, string>;
    dawnTime: string;
    duskTime: string;
    buttons: FormFooterButton[];
}

type WorldClockSettingSchema = {
    dateTheme: fields.StringField<
        "AR" | "IC" | "AG" | "AD" | "CE",
        "AR" | "IC" | "AG" | "AD" | "CE",
        true,
        false,
        true
    >;
    timeConvention: fields.NumberField<12 | 24, 12 | 24, true, false, true>;
    dawnTime: fields.SchemaField<{
        hour: fields.NumberField<HourNumbers, HourNumbers, true, false, true>;
        minute: fields.NumberField<MinuteNumbers, MinuteNumbers, true, false, true>;
    }>;
    duskTime: fields.SchemaField<{
        hour: fields.NumberField<HourNumbers, HourNumbers, true, false, true>;
        minute: fields.NumberField<MinuteNumbers, MinuteNumbers, true, false, true>;
    }>;
    playersCanView: fields.BooleanField;
    showClockButton: fields.BooleanField;
    syncDarkness: fields.BooleanField;
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
        settings: { template: `systems/${SYSTEM_ID}/templates/system/settings/world-clock/settings.hbs`, root: true },
        footer: { template: "templates/generic/form-footer.hbs" },
    };

    static #SCHEMA: fields.SchemaField<WorldClockSettingSchema> = new fields.SchemaField({
        dateTheme: new fields.StringField({
            required: true,
            choices: ["AR", "IC", "AG", "AD", "CE"],
            initial: SYSTEM_ID === "sf2e" ? "AG" : "AR",
        }),
        timeConvention: new fields.NumberField({ required: true, nullable: false, choices: [12, 24], initial: 24 }),
        playersCanView: new fields.BooleanField(),
        showClockButton: new fields.BooleanField({ initial: true }),
        syncDarkness: new fields.BooleanField(),
        dawnTime: new fields.SchemaField({
            hour: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                max: 23,
                initial: 4,
            }),
            minute: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                max: 59,
                initial: 58,
            }),
        }),
        duskTime: new fields.SchemaField({
            hour: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                max: 23,
                initial: 18,
            }),
            minute: new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                max: 59,
                initial: 34,
            }),
        }),
        worldCreatedOn: new fields.StringField({ required: true, nullable: true, blank: false, initial: null }),
    });

    /** Register World Clock settings and this menu. */
    static register(): void {
        game.settings.register(SYSTEM_ID, "worldClock", {
            name: "PF2E.SETTINGS.WorldClock.Name",
            scope: "world",
            config: false,
            type: WorldClockSettings.#SCHEMA,
            onChange: (data) => {
                const cache = game.pf2e.settings;
                const wasShowingButton = cache.worldClock.showClockButton;
                const wasSyncingDarkness = cache.worldClock.syncDarkness;
                cache.worldClock = { ...(data as WorldClockSettingData) };
                const showButtonChanged = wasShowingButton !== cache.worldClock.showClockButton;
                if (showButtonChanged && ui.controls.control?.name === "tokens") ui.controls.render({ reset: true });
                if (!wasSyncingDarkness && game.user.isActiveGM) {
                    game.pf2e.worldClock.syncDarkness(canvas.scene, { animate: false });
                }
            },
        });
        game.settings.registerMenu(SYSTEM_ID, "worldClock", {
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
            prefixPath: `${SYSTEM_ID}.worldClock.`,
        });
    }

    override async _prepareContext(): Promise<SettingsContext> {
        const buttons: FormFooterButton[] = [
            { type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" },
            {
                type: "button",
                icon: "fa-solid fa-clock-rotate-left",
                label: "PF2E.SETTINGS.WorldClock.ResetWorldTime.Label",
                tooltip: "PF2E.SETTINGS.WorldClock.ResetWorldTime.Hint",
                action: "resetWorldTime",
            },
        ];
        const settings = game.pf2e.settings.worldClock;
        const dawnTime = [
            String(settings.dawnTime.hour).padStart(2, "0"),
            String(settings.dawnTime.minute).padStart(2, "0"),
        ].join(":");
        const duskTime = [
            String(settings.duskTime.hour).padStart(2, "0"),
            String(settings.duskTime.minute).padStart(2, "0"),
        ].join(":");
        return {
            rootId: this.id,
            fields: WorldClockSettings.#SCHEMA.fields,
            settings,
            dateThemes: R.mapToObj(["AR", "IC", "AG", "AD", "CE"], (k) => [
                k,
                _loc(`PF2E.SETTINGS.WorldClock.DateThemes.${k}`),
            ]),
            timeConventions: {
                12: _loc("PF2E.SETTINGS.WorldClock.TimeConventions.12"),
                24: _loc("PF2E.SETTINGS.WorldClock.TimeConventions.24"),
            },
            dawnTime,
            duskTime,
            buttons,
        };
    }

    static async #onClickResetWorldTime(this: WorldClockSettings): Promise<void> {
        const templatePath = `systems/${SYSTEM_ID}/templates/system/settings/world-clock/confirm-reset.hbs`;
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
        type SubmitData = { [SYSTEM_ID]: { worldClock: WorldClockSettingData } };
        const submitData = fu.expandObject<SubmitData>(formData.object)[SYSTEM_ID];
        const update = {
            ...submitData.worldClock,
            worldCreatedOn: game.pf2e.settings.worldClock.worldCreatedOn,
        };

        // Process dawn and dusk times
        const isValidHour = (h: number): h is HourNumbers => h >= 0 && h < 24;
        const isValidMinute = (m: number): m is MinuteNumbers => m >= 0 && m < 60;
        for (const fieldName of ["dawnTime", "duskTime"] as const) {
            const input = this.element.querySelector<HTMLInputElement>(`#${this.id}-${fieldName}`);
            if (!input) throw new Error("Unexpected missing input elements");
            const hour = Number(input.value.replace(/:.+/, ""));
            const minute = Number(/^\d{2}:(\d{2})/.exec(input.value)?.[1]);
            if (!isValidHour(hour) || !isValidMinute(minute)) throw ErrorPF2e(`Invalid ${fieldName} value`);
            update[fieldName] = { hour, minute };
        }
        const { dawnTime: dawn, duskTime: dusk } = update;
        if (dawn.hour > dusk.hour || (dawn.hour === dusk.hour && dawn.minute >= dusk.minute)) {
            throw ErrorPF2e("Dawn must occur before dusk.");
        }

        await game.settings.set(SYSTEM_ID, "worldClock", update);
        game.pf2e.worldClock.render();
    }
}
