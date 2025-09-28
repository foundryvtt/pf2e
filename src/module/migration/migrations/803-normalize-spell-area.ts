import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { EffectAreaShape } from "@item/types.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Ensure spell-area values are numbers, null out area object if not in use */
export class Migration803NormalizeSpellArea extends MigrationBase {
    static override version = 0.803;

    #AREA_TYPES = new Set(["burst", "cone", "cube", "emanation", "line", "square"]);

    override async updateItem(source: MaybeWithAreasize): Promise<void> {
        if (source.type !== "spell") return;

        const area: MaybeWithOldAreaType = source.system.area;
        if (area) {
            area.value = Number(area.value) || 5;
            if ("areaType" in area && this.#isAreaType(area.areaType)) {
                area.type = area.areaType;
                area["-=areaType"] = null;
            }
        }

        if (!(area?.value && this.#isAreaType(area.type))) {
            source.system.area = null;
        }

        // Move old details text
        if ("areasize" in source.system && R.isPlainObject(source.system.areasize)) {
            if (this.#hasDetails(source.system.areasize.value) && area) {
                area.details = source.system.areasize.value;
            }

            delete source.system.areasize;
            source.system["-=areasize"] = null;
        }
    }

    #isAreaType(areaType: unknown): areaType is EffectAreaShape {
        return typeof areaType === "string" && areaType.length > 0 && this.#AREA_TYPES.has(areaType);
    }

    #hasDetails(details: unknown): details is string {
        return (
            typeof details === "string" &&
            details.trim().length > 0 &&
            !/^\d+-foot (?:burst|cone|cube|emanation|line|square)$/.test(details)
        );
    }
}

type MaybeWithAreasize = ItemSourcePF2e & {
    system: {
        areasize?: unknown;
        "-=areasize"?: unknown;
    };
};

type MaybeWithOldAreaType = {
    value: number;
    type: EffectAreaShape;
    areaType?: EffectAreaShape | "";
    "-=areaType"?: unknown;
    details?: string;
} | null;
