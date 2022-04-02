import { ActorPF2e, NPCPF2e } from "@actor";
import { LabeledString } from "@module/data";
import { SelectableTagField, TagSelectorOptions } from ".";
import { TagSelectorBase } from "./base";

export class SpeedSelector extends TagSelectorBase<ActorPF2e> {
    override objectProperty = "data.attributes.speed.otherSpeeds";

    static override get defaultOptions(): TagSelectorOptions {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/trait-selector/speed-types.html",
            title: "PF2E.SpeedTypes",
        });
    }

    protected get configTypes(): readonly SelectableTagField[] {
        return ["speedTypes"] as const;
    }

    override getData() {
        const data: any = super.getData();

        if (this.object instanceof NPCPF2e) {
            data.hasExceptions = true;
        }

        const choices: Record<string, { selected: boolean; label: string; value: string }> = {};
        const speeds: LabeledString[] = getProperty(this.object.data, this.objectProperty);
        const speedLabels: Record<string, string> = CONFIG.PF2E.speedTypes;
        for (const [type] of Object.entries(this.choices)) {
            const speed = speeds.find((res) => res.type === type);
            choices[type] = {
                selected: !!speed,
                label: game.i18n.localize(speedLabels[type]),
                value: speed?.value ?? "",
            };
        }
        data.choices = choices;

        return data;
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

    protected override async _updateObject(_event: Event, formData: Record<string, unknown>) {
        const update = this.getUpdateData(formData);
        if (update) {
            this.object.update({ [this.objectProperty]: update });
        }
    }

    protected getUpdateData(formData: Record<string, unknown>) {
        type TagChoice = { type: string; value: string };
        const choices: TagChoice[] = [];
        for (const [k, v] of Object.entries(formData as Record<string, any>)) {
            if (v.length > 1 && Array.isArray(v) && v[0]) {
                if (!Number.isNaN(Number(v[1])) && v[1]) {
                    choices.push({ type: k, value: v[1] });
                }
            }
        }
        return choices;
    }
}
