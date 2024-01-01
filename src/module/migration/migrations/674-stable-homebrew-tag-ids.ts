import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { HOMEBREW_TRAIT_KEYS, HomebrewTag } from "@system/settings/homebrew/index.ts";
import { sluggify } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

export class Migration674StableHomebrewTagIDs extends MigrationBase {
    static override version = 0.674;

    #homebrewKeys = fu.deepClone(HOMEBREW_TRAIT_KEYS);

    #homebrewTags = this.#homebrewKeys.reduce(
        (settings, key) => fu.mergeObject(settings, { [key]: game.settings.get("pf2e", `homebrew.${key}`) }),
        {} as Record<(typeof HOMEBREW_TRAIT_KEYS)[number], HomebrewTag[]>,
    );

    #updateDocumentTags(documentTags: string[] = []): void {
        for (const key of this.#homebrewKeys) {
            const homebrewTags = this.#homebrewTags[key];
            for (const tag of homebrewTags) {
                const index = documentTags.indexOf(tag.id);
                if (index !== -1) documentTags.splice(index, 1, `hb_${sluggify(tag.value)}`);
            }
        }
    }

    override async updateActor(source: MaybeWithExtraNestedTraits): Promise<void> {
        if (source.type === "familiar" || !source.system.traits?.traits) return;

        this.#updateDocumentTags(source.system.traits.traits.value);
        if (source.type === "character" || source.type === "npc") {
            const traits: unknown = source.system.traits;
            if (R.isObject(traits) && R.isObject(traits.languages) && Array.isArray(traits.languages.value)) {
                this.#updateDocumentTags(traits.languages.value);
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        this.#updateDocumentTags(source.system.traits?.value);
    }

    override async migrate(): Promise<void> {
        for (const key of this.#homebrewKeys) {
            const tags: { id: string; value: string }[] = this.#homebrewTags[key];

            for (const tag of tags) {
                tag.id = `hb_${sluggify(tag.value)}`;
                const tagMap: Record<string, string> =
                    key === "baseWeapons" ? CONFIG.PF2E.baseWeaponTypes : CONFIG.PF2E[key];
                tagMap[tag.id] = tag.value;
                delete tagMap[key];
            }
            if (tags.length > 0) await game.settings.set("pf2e", `homebrew.${key}`, tags);
        }
    }
}

type MaybeWithExtraNestedTraits = ActorSourcePF2e & {
    system: {
        traits: {
            traits?: { value: string[] };
        };
    };
};
