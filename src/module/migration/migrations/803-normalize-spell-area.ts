import { EffectAreaSize, EffectAreaType } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { isObject } from "@util";
import { MigrationBase } from "../base";

/** Ensure spell-area values are numbers, null out area object if not in use */
export class Migration803NormalizeSpellArea extends MigrationBase {
    static override version = 0.803;

    #AREA_TYPES = new Set(["burst", "cone", "cube", "emanation", "line", "square"]);

    override async updateItem(source: MaybeWithAreasize): Promise<void> {
        if (source.type !== "spell") return;

        const area: MaybeWithOldAreaType = source.system.area;
        if (area) {
            area.value = Number(area.value) as EffectAreaSize;
            if ("areaType" in area && this.#isAreaType(area.areaType)) {
                area.type = area.areaType;
                delete area.areaType;
                area["-=areaType"] = null;
            }
        }

        if (!(area?.value && this.#isAreaType(area.type))) {
            source.system.area = null;
        }

        // Move old details text
        if ("areasize" in source.system && isObject<{ value: string }>(source.system.areasize)) {
            if (this.#hasDetails(source.system.areasize.value) && area) {
                area.details = source.system.areasize.value;
            }

            delete source.system.areasize;
            source.system["-=areasize"] = null;
        }
    }

    #isAreaType(areaType: unknown): areaType is EffectAreaType {
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
    value: EffectAreaSize;
    type: EffectAreaType;
    areaType?: EffectAreaType | "";
    "-=areaType"?: unknown;
    details?: string;
} | null;
