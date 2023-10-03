import { ActorSourcePF2e } from "@actor/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Move hazard source(book) object to be in line with NPCs */
export class Migration837MoveHazardBookSources extends MigrationBase {
    static override version = 0.837;

    override async updateActor(source: MaybeWithMisplacedSource): Promise<void> {
        if (source.type === "hazard" && isObject<string>(source.system.source)) {
            const value = typeof source.system.source.value === "string" ? source.system.source.value : "";
            const author = typeof source.system.source.author === "string" ? source.system.source.author : "";
            source.system.details.source = { value, author };

            if ("game" in globalThis) {
                source.system["-=source"] = null;
            } else {
                delete source.system.source;
            }
        }
    }
}

type MaybeWithMisplacedSource = ActorSourcePF2e & {
    system: {
        source?: unknown;
        "-=source"?: null;
    };
};
