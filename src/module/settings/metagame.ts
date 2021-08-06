import { SettingsMenuPF2e } from "./menu";

type ConfigPF2eListName = typeof MetagameSettings.SETTINGS[number];

const metagameDcChoices = {
    none: "PF2E.SETTINGS.Metagame.ShowDC.None",
    gm: "PF2E.SETTINGS.Metagame.ShowDC.Gm",
    owner: "PF2E.SETTINGS.Metagame.ShowDC.Owner",
    all: "PF2E.SETTINGS.Metagame.ShowDC.All",
};

const metagameResultsChoices = {
    none: "PF2E.SETTINGS.Metagame.ShowResults.None",
    gm: "PF2E.SETTINGS.Metagame.ShowResults.Gm",
    owner: "PF2E.SETTINGS.Metagame.ShowResults.Owner",
    all: "PF2E.SETTINGS.Metagame.ShowResults.All",
};

export class MetagameSettings extends SettingsMenuPF2e {
    static override readonly namespace = "metagame";

    static override readonly SETTINGS = ["secretDamage", "secretCondition", "showDC", "showResults"] as const;

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: "PF2E.SETTINGS.Metagame.Name",
            id: "metagame-settings",
            template: "systems/pf2e/templates/system/settings/metagame.html",
            width: 550,
            height: "auto",
            closeOnSubmit: true,
        });
    }

    protected static override get settings(): Record<ConfigPF2eListName, ClientSettingsData> {
        return {
            secretDamage: {
                name: "PF2E.SETTINGS.Metagame.SecretDamage.Name",
                hint: "PF2E.SETTINGS.Metagame.SecretDamage.Hint",
                scope: "world",
                config: false,
                default: false,
                type: Boolean,
            },
            secretCondition: {
                name: "PF2E.SETTINGS.Metagame.SecretCondition.Name",
                hint: "PF2E.SETTINGS.Metagame.SecretCondition.Hint",
                scope: "world",
                config: false,
                default: false,
                type: Boolean,
            },
            showDC: {
                name: "PF2E.SETTINGS.Metagame.ShowDC.Name",
                hint: "PF2E.SETTINGS.Metagame.ShowDC.Hint",
                scope: "world",
                config: false,
                default: "gm",
                type: String,
                choices: metagameDcChoices,
            },
            showResults: {
                name: "PF2E.SETTINGS.Metagame.ShowResults.Name",
                hint: "PF2E.SETTINGS.Metagame.ShowResults.Hint",
                scope: "world",
                config: false,
                default: "gm",
                type: String,
                choices: metagameResultsChoices,
            },
        };
    }
}
