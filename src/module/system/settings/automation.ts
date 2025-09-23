import { ErrorPF2e } from "@util";
import * as R from "remeda";
import { PartialSettingsData, SettingsMenuPF2e } from "./menu.ts";
import fields = foundry.data.fields;

type ConfigPF2eListName = (typeof AutomationSettings.SETTINGS)[number];

export class AutomationSettings extends SettingsMenuPF2e {
    static override readonly namespace = "automation";

    static override readonly SETTINGS = [
        "rulesBasedVision",
        "iwr",
        "removeExpiredEffects",
        "flankingDetection",
        "encumbrance",
        "lootableNPCs",
        "reachEnforcement",
    ] as const;

    static override get defaultOptions(): fav1.api.FormApplicationOptions {
        return Object.assign(super.defaultOptions, { submitOnChange: false });
    }

    protected static override get settings(): Record<ConfigPF2eListName, PartialSettingsData> {
        const prefix = `${AutomationSettings.namespace}.`;
        return {
            rulesBasedVision: {
                prefix,
                name: "PF2E.SETTINGS.Automation.RulesBasedVision.Name",
                hint: "PF2E.SETTINGS.Automation.RulesBasedVision.Hint",
                default: true,
                type: Boolean,
                onChange: (value) => {
                    game.pf2e.settings.rbv = !!value;
                    for (const token of canvas.scene?.tokens ?? []) {
                        token.reset();
                    }
                    canvas.perception.update({ initializeLighting: true, initializeVision: true });
                },
            },
            iwr: {
                prefix,
                name: "PF2E.SETTINGS.Automation.IWR.Name",
                hint: "PF2E.SETTINGS.Automation.IWR.Hint",
                default: true,
                type: Boolean,
                onChange: (value) => {
                    game.pf2e.settings.iwr = !!value;
                },
            },
            removeExpiredEffects: {
                prefix,
                name: "PF2E.SETTINGS.Automation.RemoveExpiredEffects.Name",
                hint: "PF2E.SETTINGS.Automation.RemoveExpiredEffects.Hint",
                default: true,
                type: Boolean,
            },
            flankingDetection: {
                prefix,
                name: "PF2E.SETTINGS.Automation.FlankingDetection.Name",
                hint: "PF2E.SETTINGS.Automation.FlankingDetection.Hint",
                default: true,
                type: Boolean,
            },
            encumbrance: {
                prefix,
                name: "PF2E.SETTINGS.Automation.Encumbrance.Name",
                hint: "PF2E.SETTINGS.Automation.Encumbrance.Hint",
                default: false,
                type: Boolean,
                onChange: (value) => {
                    game.pf2e.settings.encumbrance = !!value;
                },
            },
            lootableNPCs: {
                prefix,
                name: "PF2E.SETTINGS.Automation.LootableNPCs.Name",
                hint: "PF2E.SETTINGS.Automation.LootableNPCs.Hint",
                default: true,
                type: Boolean,
            },
            reachEnforcement: {
                name: "PF2E.SETTINGS.Automation.ReachEnforcement.Name",
                hint: "PF2E.SETTINGS.Automation.ReachEnforcement.Hint",
                prefix,
                type: new fields.SetField(
                    new fields.StringField({
                        required: true,
                        label: "PF2E.SETTINGS.Automation.ReachEnforcement.Name",
                        choices: R.mapToObj(["corpses", "doors", "loot", "merchants"] as const, (v) => [
                            v,
                            `PF2E.SETTINGS.Automation.ReachEnforcement.${v}`,
                        ]),
                    }),
                    { required: true, initial: ["doors"] },
                ),
                onChange: (value) => {
                    if (!(value instanceof Set)) throw ErrorPF2e("Unexpected setting value");
                    game.pf2e.settings.automation.reachEnforcement = value;
                },
            },
        };
    }
}
