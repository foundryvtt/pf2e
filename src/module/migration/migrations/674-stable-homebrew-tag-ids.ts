import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { HomebrewElements, HomebrewTag } from "@system/settings/homebrew";
import { LocalizePF2e } from "@system/localize";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

export class Migration674StableHomebrewTagIDs extends MigrationBase {
    static override version = 0.674;

    private homebrewKeys = deepClone(HomebrewElements.SETTINGS);

    private homebrewTags = this.homebrewKeys.reduce(
        (settings, key) => mergeObject(settings, { [key]: game.settings.get("pf2e", `homebrew.${key}`) }),
        {} as Record<typeof this.homebrewKeys[number], HomebrewTag[]>
    );

    private updateDocumentTags(documentTags: string[] = []): void {
        for (const key of this.homebrewKeys) {
            const homebrewTags = this.homebrewTags[key];
            for (const tag of homebrewTags) {
                const index = documentTags.indexOf(tag.id);
                if (index !== -1) documentTags.splice(index, 1, `hb_${sluggify(tag.value)}`);
            }
        }
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type === "familiar") return;

        this.updateDocumentTags(actorSource.data.traits.traits.value);
        if (actorSource.type === "character" || actorSource.type === "npc") {
            this.updateDocumentTags(actorSource.data.traits?.languages.value);
        }
    }

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        this.updateDocumentTags(itemSource.data.traits?.value);
    }

    override async migrate(): Promise<void> {
        for await (const key of this.homebrewKeys) {
            const tags: { id: string; value: string }[] = this.homebrewTags[key];

            for (const tag of tags) {
                tag.id = `hb_${sluggify(tag.value)}`;
                const tagMap: Record<string, string> =
                    key === "baseWeapons" ? LocalizePF2e.translations.PF2E.Weapon.Base : CONFIG.PF2E[key];
                tagMap[tag.id] = tag.value;
                delete tagMap[key];
            }
            if (tags.length > 0) await game.settings.set("pf2e", `homebrew.${key}`, tags);
        }
    }
}
