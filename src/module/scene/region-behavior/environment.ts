import { resetActors } from "@actor/helpers.ts";
import type { RegionEventType } from "types/foundry/client-esm/data/region-behaviors/base.d.ts";
import type { SetField, StringField } from "types/foundry/common/data/fields.d.ts";
import { RegionBehaviorPF2e } from "./document.ts";
import { RegionEventPF2e } from "./types.ts";

class EnvironmentBehaviorType extends foundry.data.regionBehaviors.RegionBehaviorType<
    EnvironmentTypeSchema,
    RegionBehaviorPF2e | null
> {
    override events = new Set<RegionEventType>(["tokenEnter", "tokenExit"]);

    static override defineSchema(): EnvironmentTypeSchema {
        const fields = foundry.data.fields;
        return {
            environmentTypes: new fields.SetField(
                new fields.StringField({
                    blank: true,
                    choices: () => CONFIG.PF2E.environmentTypes,
                }),
                { label: "PF2E.Region.Environment.Type.Label", hint: "PF2E.Region.Environment.Type.Hint" },
            ),
            mode: new fields.StringField({
                blank: false,
                choices: () => ({
                    add: "PF2E.Region.Environment.Mode.Add.Label",
                    override: "PF2E.Region.Environment.Mode.Override.Label",
                    remove: "PF2E.Region.Environment.Mode.Remove.Label",
                }),
                initial: "add",
                label: "PF2E.Region.Environment.Mode.Label",
                hint: "PF2E.Region.Environment.Mode.Hint",
            }),
        };
    }

    protected override async _handleRegionEvent(event: RegionEventPF2e): Promise<void> {
        if (event.name === "tokenEnter" || event.name === "tokenExit") {
            if (event.data.token.actor) resetActors([event.data.token.actor], { tokens: true });
        }
    }
}

interface EnvironmentBehaviorType
    extends foundry.data.regionBehaviors.RegionBehaviorType<EnvironmentTypeSchema, RegionBehaviorPF2e | null>,
        ModelPropsFromSchema<EnvironmentTypeSchema> {}

type EnvironmentTypeSchema = {
    environmentTypes: SetField<StringField>;
    mode: StringField<"add" | "remove" | "override">;
};

type EnvironmentTypeData = ModelPropsFromSchema<EnvironmentTypeSchema>;
type EnvironmentTypeSource = SourceFromSchema<EnvironmentTypeSchema>;

export { EnvironmentBehaviorType };
export type { EnvironmentTypeData, EnvironmentTypeSource };
