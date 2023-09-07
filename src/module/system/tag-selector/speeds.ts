import type { ActorPF2e } from "@actor";
import { ErrorPF2e, htmlQueryAll } from "@util";
import { BaseTagSelector, TagSelectorData } from "./base.ts";
import { SelectableTagField, TagSelectorOptions } from "./index.ts";

class SpeedSelector<TActor extends ActorPF2e> extends BaseTagSelector<TActor> {
    protected objectProperty = "system.attributes.speed.otherSpeeds";

    static override get defaultOptions(): TagSelectorOptions {
        return mergeObject(super.defaultOptions, {
            id: "speed-selector",
            template: "systems/pf2e/templates/system/tag-selector/speeds.hbs",
            title: "PF2E.SpeedTypes",
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["speedTypes"];
    }

    override async getData(options?: Partial<TagSelectorOptions>): Promise<SpeedSelectorData<TActor>> {
        if (!this.document.isOfType("creature")) {
            throw ErrorPF2e("The Speed selector is usable only with creature-type actors");
        }

        const speeds = this.document.system.attributes.speed.otherSpeeds;
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
            ...(await super.getData(options)),
            hasExceptions: this.document.isOfType("npc"),
            choices,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Automatically check or uncheck a speed depending on the value
        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[type=number]")) {
            input.addEventListener("input", () => {
                const checkbox = input.closest("li")?.querySelector<HTMLInputElement>("input[type=checkbox]");
                if (checkbox) checkbox.checked = !!Number(input.value);
            });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        type TagChoice = { type: string; value: number };
        const update = Object.entries(formData).flatMap(([key, value]): TagChoice | never[] => {
            if (!(Array.isArray(value) && value.length === 2)) return [];
            const selected = !!value[0];
            const distance = Math.trunc(Math.abs(value[1]));
            if (!(selected && distance)) return [];

            return { type: key, value: Math.max(distance, 5) };
        });

        return super._updateObject(event, { [this.objectProperty]: update });
    }
}

interface SpeedSelectorData<TActor extends ActorPF2e> extends TagSelectorData<TActor> {
    hasExceptions: boolean;
    choices: Record<string, ChoiceData>;
}

interface ChoiceData {
    selected: boolean;
    disabled: boolean;
    label: string;
    value: number | string;
}

export { SpeedSelector };
