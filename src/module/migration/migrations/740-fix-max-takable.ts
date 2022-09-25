import { ItemSourcePF2e } from "@item/data";
import { FeatSystemSource } from "@item/feat/data";
import { MigrationBase } from "../base";

/** Remove maxTaken property from feats leftover from development */
export class Migration740MaxTakable extends MigrationBase {
    static override version = 0.74;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat") return;

        const systemData: MaybeWithMaxTaken = source.system;
        if ("maxTaken" in systemData) {
            if (typeof systemData.maxTaken === "number" && typeof systemData.maxTakable !== "number") {
                systemData.maxTakable = systemData.maxTaken;
            }

            delete systemData.maxTaken;
            systemData["-=maxTaken"] = null;
        }

        if ("maxTakable" in systemData && typeof systemData.maxTakable !== "number") {
            systemData.maxTakable = null;
        }
    }
}

interface MaybeWithMaxTaken extends FeatSystemSource {
    maxTaken?: unknown;
    "-=maxTaken"?: null;
}
