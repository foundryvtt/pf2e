import { ActorPF2e } from "@actor";
import { ErrorPF2e } from "@util";
import { SelectableTagField, TagSelectorOptions } from ".";
import { BaseTagSelector } from "./base";

export class SpeedSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    protected objectProperty = "system.attributes.speed.otherSpeeds";

    static override get defaultOptions(): TagSelectorOptions {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/tag-selector/speeds.hbs",
            title: "PF2E.SpeedTypes",
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["speedTypes"] as const;
    }

    override async getData(): Promise<SpeedSelectorData<TActor>> {
        if (!this.object.isOfType("creature")) {
            throw ErrorPF2e("The Speed selector is usable only with creature-type actors");
        }

        const speeds = this.object.system.attributes.speed.otherSpeeds;
        const speedLabels: Record<string, string> = CONFIG.PF2E.speedTypes;
        const choices = Object.keys(this.choices).reduce((accum: Record<string, ChoiceData>, type) => {
            const speed = speeds.find((s) => s.type === type);
            return {
                ...accum,
                [type]: {
                    selected: !!speed,
                    disabled: !!speed?.source,
                    label: game.i18n.localize(speedLabels[type]),
                    value: Number(speed?.value) || "",
                },
            };
        }, {});

        return {
            ...(await super.getData()),
            hasExceptions: this.object.isOfType("npc"),
            choices,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html
            .find<HTMLInputElement>("input[id^=input_value]")
            .on("focusin", (event) => {
                const input = $(event.currentTarget);
                input.prev().prev().prop("checked", true);
            })
            .on("focusout", (event) => {
                const input = $(event.currentTarget);
                if (!input.val()) {
                    input.prev().prev().prop("checked", false);
                }
            });
    }

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        type TagChoice = { type: string; value: number };
        const update = Object.entries(formData).flatMap(([key, value]): TagChoice | never[] => {
            if (!(Array.isArray(value) && value.length === 2)) return [];
            const selected = !!value[0];
            const distance = Math.trunc(Math.abs(value[1]));
            if (!(selected && distance)) return [];

            return { type: key, value: distance };
        });

        this.object.update({ [this.objectProperty]: update });
    }
}

interface SpeedSelectorData<TActor extends ActorPF2e> extends FormApplicationData<TActor> {
    hasExceptions: boolean;
    choices: Record<string, ChoiceData>;
}

interface ChoiceData {
    selected: boolean;
    disabled: boolean;
    label: string;
    value: number | string;
}
