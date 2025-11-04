import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { TreasureSystemSource } from "@item/treasure/data.ts";
import type { PublicationData } from "@module/data.ts";
import { MigrationBase } from "../base.ts";

export class Migration951TreasureCategories extends MigrationBase {
    static override version = 0.951;

    override async updateItem(source: ItemSourcePF2e & { "==system"?: object }): Promise<void> {
        if (source.type !== "treasure") return;
        const system: TreasureSystemSourceWithDeletion = source.system;
        if (system.category === "coin" || system.stackGroup === "coins") {
            system.category ??= "coin";
            if ((system.publication.title = "Pathfinder Core Rulebook")) {
                this.#setPublication(system.publication, "Pathfinder Player Core");
            }
        } else if (system.stackGroup === "gems" || system.category === "gem") {
            source.system.category ??= "gem";
        } else if (system.publication.title === "Pathfinder Gamemastery Guide") {
            source.system.category ??= "art-object";
        }
        if (system.category && system.publication.title === "Pathfinder Gamemastery Guide") {
            this.#setPublication(system.publication, "Pathfinder GM Core");
        }
        delete system.stackGroup;
        source["==system"] = system;
    }

    #setPublication(data: PublicationData, title: string): void {
        data.license = "ORC";
        data.remaster = true;
        data.title = title;
    }
}

interface TreasureSystemSourceWithDeletion extends TreasureSystemSource {
    stackGroup?: "coins" | "gems" | null;
    "-=stackGroup"?: null;
}
