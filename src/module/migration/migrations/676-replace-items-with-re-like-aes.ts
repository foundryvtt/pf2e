import { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Replace items containing FlatModifier `ActiveEffect`s with latest ones without */
export class Migration676ReplaceItemsWithRELikeAEs extends MigrationBase {
    static override version = 0.676;

    /** The feats Toughness and Mountain's Stoutness */
    private toughnessPromise = fromUuid<ItemPF2e>("Compendium.pf2e.feats-srd.AmP0qu7c5dlBSath");
    private stoutnessPromise = fromUuid<ItemPF2e>("Compendium.pf2e.feats-srd.COP89tjrNhEucuRW");

    /** The familiar ability Tough */
    private toughPromise = fromUuid<ItemPF2e>("Compendium.pf2e.familiar-abilities.Le8UWr5BU8rV3iBf");

    private replaceItem({ items, type, slug, replacement }: ReplaceItemArgs): void {
        if (!replacement) throw new Error("Unexpected error retrieving compendium item");
        const current = items.find(
            (itemSource) => itemSource.type === type && itemSource.system.slug?.replace(/'/g, "") === slug,
        );
        if (current) {
            const newSource = replacement.toObject();
            if (current.type === "feat" && newSource.type === "feat") {
                newSource.system.location = current.system.location;
            }
            items.splice(items.indexOf(current), 1, newSource);
        }
    }

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type === "familiar") {
            this.replaceItem({
                items: actorSource.items,
                type: "effect",
                slug: "tough",
                replacement: await this.toughPromise,
            });
        } else if (actorSource.type === "character") {
            this.replaceItem({
                items: actorSource.items,
                type: "feat",
                slug: "toughness",
                replacement: await this.toughnessPromise,
            });
            this.replaceItem({
                items: actorSource.items,
                type: "feat",
                slug: "mountains-stoutness",
                replacement: await this.stoutnessPromise,
            });
        }
    }
}

interface ReplaceItemArgs {
    items: ItemSourcePF2e[];
    type: string;
    slug: string;
    replacement: ItemPF2e | null;
}
