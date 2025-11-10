import type { ModifyMovementCostBehaviorSchema } from "@client/data/region-behaviors/increase-movement-cost.d.mts";
import * as R from "remeda";
import fields = foundry.data.fields;
import regionBehaviors = foundry.data.regionBehaviors;

export class DifficultTerrainBehaviorType extends regionBehaviors.ModifyMovementCostRegionBehaviorType {
    /** Clamp values to between 1 (normal terrain) and 3 (greater difficult terrain). */
    static override defineSchema(): ModifyMovementCostBehaviorSchema {
        const movementTypes = Object.keys(super.defineSchema().difficulties.fields);
        const numberFields = R.mapToObj(movementTypes, (t) => [
            t,
            new fields.NumberField({
                required: true,
                nullable: true,
                choices: {
                    1: "",
                    2: "PF2E.Region.DifficultTerrain.DifficultTerrain",
                    3: "PF2E.Region.DifficultTerrain.GreaterDifficultTerrain",
                },
                initial: 1,
                label: CONFIG.Token.movement.actions[t].label,
            }),
        ]);
        return { difficulties: new fields.SchemaField(numberFields) };
    }

    /** Ensure difficulty values are among valid choices in case of creation before assumption of system ownership.  */
    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        const migrated = super.migrateData(source);
        if (!R.isPlainObject(migrated.difficulties)) return migrated;
        for (const [key, value] of Object.entries(migrated.difficulties)) {
            migrated.difficulties[key] = Math.clamp(Math.trunc(Number(value)) || 1, 1, 3);
        }
        return migrated;
    }
}
