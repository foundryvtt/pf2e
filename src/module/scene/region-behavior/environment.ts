import { resetActors } from "@actor/helpers.ts";
import type { RegionEventType } from "types/foundry/client-esm/data/region-behaviors/base.d.ts";
import type { BooleanField, SetField, StringField } from "types/foundry/common/data/fields.d.ts";
import type { RegionEventPF2e } from "./types.ts";

class EnvironmentBehaviorTypePF2e extends foundry.data.regionBehaviors.RegionBehaviorType<EnvironmentTypeSchema> {
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
            difficultTerrain: new fields.StringField({
                blank: true,
                choices: () => ({
                    standard: "PF2E.Region.Environment.DifficultTerrain.Option.Standard",
                    greater: "PF2E.Region.Environment.DifficultTerrain.Option.Greater",
                }),
                label: "PF2E.Region.Environment.DifficultTerrain.Standard",
                hint: "PF2E.Region.Environment.DifficultTerrain.Option.Hint",
            }),
            isMagical: new fields.BooleanField({
                initial: false,
                label: "PF2E.Region.Environment.DifficultTerrain.Magical.Label",
                hint: "PF2E.Region.Environment.DifficultTerrain.Magical.Hint",
            }),
            groundOnly: new fields.BooleanField({
                initial: true,
                label: "PF2E.Region.Environment.DifficultTerrain.GroundOnly.Label",
                hint: "PF2E.Region.Environment.DifficultTerrain.GroundOnly.Hint",
            }),
        };
    }

    protected override async _handleRegionEvent(event: RegionEventPF2e): Promise<void> {
        if (event.name === "tokenEnter" || event.name === "tokenExit") {
            if (event.data.token.actor) resetActors([event.data.token.actor], { tokens: true });
        }
    }
}

interface EnvironmentBehaviorTypePF2e
    extends foundry.data.regionBehaviors.RegionBehaviorType<EnvironmentTypeSchema>,
        ModelPropsFromSchema<EnvironmentTypeSchema> {}

type EnvironmentTypeSchema = {
    environmentTypes: SetField<StringField>;
    mode: StringField<"add" | "remove" | "override">;
    difficultTerrain: StringField<"standard" | "greater">;
    isMagical: BooleanField;
    groundOnly: BooleanField;
};

type EnvironmentTypeData = ModelPropsFromSchema<EnvironmentTypeSchema>;
type EnvironmentTypeSource = SourceFromSchema<EnvironmentTypeSchema>;

export { EnvironmentBehaviorTypePF2e };
export type { EnvironmentTypeData, EnvironmentTypeSource };
