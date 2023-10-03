import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { isObject } from "@util";

/** Convert heritage "feats" be of type "heritage" */
export class Migration610SetHeritageFeatType extends MigrationBase {
    static override version = 0.61;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const itemTraits: string[] | undefined = source.system.traits?.value;
        if (source.type === "feat" && itemTraits?.includes("heritage")) {
            const { system } = source;
            const featType =
                "featType" in system &&
                isObject(system.featType) &&
                "value" in system.featType &&
                typeof system.featType.value === "string"
                    ? system.featType
                    : { value: "" };
            featType.value = "heritage";
            const index = itemTraits.indexOf("heritage");
            itemTraits.splice(index, 1);
        }
    }
}
