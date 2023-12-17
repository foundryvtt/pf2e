import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import type { JournalEntrySource } from "types/foundry/common/documents/journal-entry.d.ts";
import { MigrationBase } from "../base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { isObject } from "remeda";

/** Rename all uses and mentions of "flat-footed" to "off-guard"  */
export class Migration850FlatFootedToOffGuard extends MigrationBase {
    static override version = 0.85;

    #oldNamePattern = new RegExp(/\bFlat-Footed\b/g);

    #newName = "Off-Guard";

    #imgPattern = /(?<=systems\/pf2e\/icons\/conditions(?:-2)?\/)flat-?footed.webp$/i;

    #aToAnUUIDPatern = /\ba(?= @UUID\[Compendium\.pf2e\.conditionitems\.Item\.(?:Flat-Footed|AJh5ex99aV6VTggg)\])/g;

    #replace(text: string): string {
        return (
            text
                .replace(this.#imgPattern, "off-guard.webp")
                // slugs
                .replace(/^flat-footed$/, "off-guard")
                // predicates and IWR localization key
                .replace(/(?<=[:.])flat-footed\b/g, "off-guard")
                // Pre-build UUIDs
                .replace(/\.Flat-Footed\b/g, ".Off-Guard")
                // Localization keys
                .replace(/\bFlatFooted\b/g, "OffGuard")
                // Rule elements affecting flanking
                .replace(/\.flatFootable\b/g, ".offGuardable")
                // Names and uses/mentions in prose (English-only)
                .replace(this.#oldNamePattern, "Off-Guard")
                .replace(/\bflatfooted\b/g, "flat-footed")
                .replace(/\ba flat-footed\b/g, "an off-guard")
                .replace(this.#aToAnUUIDPatern, "an")
                .replace(/\bFlat-footed\b/g, "Off-guard")
                // Lowercase catch-all
                .replace(/\bflat-footed\b/g, "off-guard")
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "hazard") {
            source.system.details.routine &&= this.#replace(source.system.details.routine);
        }

        if (
            "attributes" in source.system &&
            isObject(source.system.attributes) &&
            "immunities" in source.system.attributes
        ) {
            source.system.attributes.immunities = recursiveReplaceString(source.system.attributes.immunities, (s) =>
                this.#replace(s),
            );
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.name = source.name.replace(this.#oldNamePattern, this.#newName);
        source.img = source.img.replace(this.#imgPattern, "off-guard.webp") as ImageFilePath;
        source.system = recursiveReplaceString(source.system, (s) => this.#replace(s));
    }

    override async updateJournalEntry(source: JournalEntrySource): Promise<void> {
        if (source.name === "Remaster Changes") return;

        source.name = source.name.replace(this.#oldNamePattern, this.#newName);
        if ("img" in source && typeof source.img === "string") {
            source.img = source.img.replace(this.#imgPattern, "off-guard.webp");
        }
        source.pages = recursiveReplaceString(source.pages, (s) => this.#replace(s));
        if ("content" in source && typeof source.content === "string") {
            source.content = this.#replace(source.content);
        }
    }
}
