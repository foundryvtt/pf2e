import type { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { PublicationData } from "@module/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Standardize location and structure of actor/item publication data */
export class Migration877PublicationData extends MigrationBase {
    static override version = 0.877;

    #setPublicationData(
        systemSource: { details?: { publication: PublicationData }; publication?: PublicationData },
        oldData: { value?: unknown; author?: unknown },
    ): void {
        const title = typeof oldData.value === "string" ? oldData.value.trim() : "";
        const authors = typeof oldData.author === "string" ? oldData.author.trim() : "";
        const license = title === "Pathfinder Player Core" ? "ORC" : "OGL";
        const remaster = ["Pathfinder Player Core", "Pathfinder Rage of Elements"].includes(title);
        const publication = { title, authors, license, remaster } as const;

        if (R.isObject(systemSource.details)) {
            systemSource.details.publication = publication;
        } else {
            systemSource.publication = publication;
        }
    }

    override async updateActor(source: ActorWithOldPublicationData): Promise<void> {
        if (source.type !== "hazard" && source.type !== "npc" && source.type !== "vehicle") {
            return;
        }

        if (source.type === "vehicle" && R.isObject(source.system.source)) {
            this.#setPublicationData(source.system, source.system.source);
            if ("game" in globalThis) {
                source.system["-=source"] = null;
            } else {
                delete source.system.source;
            }
        } else if ((source.type === "hazard" || source.type === "npc") && R.isObject(source.system.details.source)) {
            this.#setPublicationData(source.system, source.system.details.source);
            if ("game" in globalThis) {
                source.system.details["-=source"] = null;
            } else {
                delete source.system.details.source;
            }
        }
    }

    override async updateItem(source: ItemWithOldPublicationData): Promise<void> {
        // Data entry script snafu?
        if ("details" in source.system && R.isObject(source.system.details)) {
            const oldDataInWrongPlace = source.system.details.source;
            if (R.isObject(oldDataInWrongPlace) && typeof oldDataInWrongPlace.value === "string") {
                source.system.source = { value: oldDataInWrongPlace.value.trim() };
            }
            if ("game" in globalThis) {
                source.system["-=details"] = null;
            } else {
                delete source.system.details;
            }
        }

        if (R.isObject(source.system.source)) {
            this.#setPublicationData(source.system, source.system.source);

            if ("game" in globalThis) {
                source.system["-=source"] = null;
            } else {
                delete source.system.source;
            }
        } else if (!source.system.publication && !("game" in globalThis)) {
            this.#setPublicationData(source.system, {});
        }
    }
}

type ActorWithOldPublicationData = ActorSourcePF2e & {
    system: {
        source?: unknown;
        "-=source"?: null;
        details: {
            source?: unknown;
            "-=source"?: null;
        };
    };
};

type ItemWithOldPublicationData = ItemSourcePF2e & {
    system: {
        source?: unknown;
        "-=source"?: null;
        "-=details"?: null;
    };
};
