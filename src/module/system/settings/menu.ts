import type { SettingRegistration } from "@client/helpers/client-settings.d.mts";
import { htmlClosest, htmlQuery } from "@util";
import * as R from "remeda";

abstract class SettingsMenuPF2e extends fav1.api.FormApplication {
    static readonly namespace: string;

    protected cache: Record<string, unknown> & { clear(): void } = (() => {
        const data: Record<string, unknown> & { clear(): void } = {
            clear(): void {
                for (const key of Object.keys(this)) {
                    delete this[key];
                }
            },
        };
        Object.defineProperty(data, "clear", { enumerable: false });
        return data;
    })();

    static override get defaultOptions(): fav1.api.FormApplicationOptions {
        const options = super.defaultOptions;
        options.classes.push("settings-menu", "sheet");

        return {
            ...options,
            title: `PF2E.SETTINGS.${this.namespace.titleCase()}.Name`,
            id: `${this.namespace}-settings`,
            template: `${SYSTEM_ROOT}/templates/system/settings/menu.hbs`,
            width: 550,
            height: "auto",
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: "form" }],
            closeOnSubmit: false,
            submitOnChange: true,
        };
    }

    static readonly SETTINGS: readonly string[];

    /** Settings to be registered and also later referenced during user updates */
    protected static get settings(): Record<string, PartialSettingsData> {
        return {};
    }

    static registerSettings(): void {
        const settings = this.settings;
        for (const key of this.SETTINGS) {
            const setting = settings[key];
            game.settings.register("pf2e", `${setting.prefix ?? ""}${key}`, {
                ...R.omit(setting, ["prefix"]),
                scope: "world",
                config: false,
            });
        }
    }

    get namespace(): string {
        return this.constructor.namespace;
    }

    override async getData(): Promise<MenuTemplateData> {
        const settings = (this.constructor as typeof SettingsMenuPF2e).settings;
        const templateData = settingsToSheetData(settings, this.cache);

        // Ensure cache values are initialized
        for (const [key, value] of Object.entries(settings)) {
            if (!(key in this.cache)) {
                this.cache[key] = game.settings.get("pf2e", `${value.prefix ?? ""}${key}`);
            }
        }

        return fu.mergeObject(await super.getData(), {
            settings: templateData,
            instructions: `PF2E.SETTINGS.${this.namespace.titleCase()}.Hint`,
        });
    }

    override close(options?: { force?: boolean }): Promise<void> {
        this.cache.clear();
        return super.close(options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "button[type=reset]")?.addEventListener("click", () => {
            this.cache.clear();
            this.render();
        });

        const { highlightSetting } = this.options;
        if (highlightSetting) {
            const formGroup = htmlClosest(htmlQuery(html, `label[for="${highlightSetting}"]`), ".form-group");
            if (formGroup) formGroup.style.animation = "glow 0.75s infinite alternate";
        }
    }

    protected override async _updateObject(event: Event, data: Record<string, unknown>): Promise<void> {
        for (const key of this.constructor.SETTINGS) {
            const setting = this.constructor.settings[key];
            const settingKey = `${setting.prefix ?? ""}${key}`;
            const value = data[key] instanceof Set ? data[key].values().toArray() : data[key];
            this.cache[key] = value;
            if (event.type === "submit") {
                await game.settings.set("pf2e", settingKey, value);
            }
        }
        if (event.type === "submit") {
            this.close();
        } else {
            this.render();
        }
    }

    /** Overriden to add some additional first-render behavior */
    protected override _injectHTML($html: JQuery<HTMLElement>): void {
        super._injectHTML($html);

        // Initialize cache
        for (const key of this.constructor.SETTINGS) {
            const setting = this.constructor.settings[key];
            const settingKey = `${setting.prefix ?? ""}${key}`;
            const value = game.settings.get("pf2e", settingKey);
            this.cache[key] = value instanceof foundry.abstract.DataModel ? value.clone() : value;
        }
    }
}

interface SettingsMenuPF2e extends fav1.api.FormApplication {
    constructor: typeof SettingsMenuPF2e;
    options: SettingsMenuOptions;
}

interface PartialSettingsData extends Omit<SettingRegistration, "scope" | "config"> {
    prefix?: string;
    tab?: string;
}

interface SettingsTemplateData extends PartialSettingsData {
    key: string;
    value: unknown;
    isDataField: boolean;
    isSelect: boolean;
    isCheckbox: boolean;
}

interface MenuTemplateData extends fav1.api.FormApplicationData {
    settings: Record<string, SettingsTemplateData>;
}

interface SettingsMenuOptions extends fav1.api.FormApplicationOptions {
    highlightSetting?: string;
}

function settingsToSheetData(
    settings: Record<string, PartialSettingsData>,
    cache: Record<string, unknown> = {},
): Record<string, SettingsTemplateData> {
    return R.mapValues(settings, (setting, key) => {
        const lookupKey = `${setting.prefix ?? ""}${key}`;
        const value = key in cache ? cache[key] : game.settings.get("pf2e", lookupKey);
        return {
            ...setting,
            key,
            value,
            isDataField: setting.type instanceof foundry.data.fields.DataField,
            isSelect: !!setting.choices,
            isCheckbox: setting.type === Boolean,
        };
    });
}

export { SettingsMenuPF2e, settingsToSheetData };
export type { MenuTemplateData, PartialSettingsData, SettingsMenuOptions, SettingsTemplateData };
