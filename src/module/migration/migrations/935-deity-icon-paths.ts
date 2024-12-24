import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { TokenSource } from "types/foundry/common/documents/token.d.ts";
import { MigrationBase } from "../base.ts";

/** Clean up Calling items, setting a category and removing tags */
export class Migration935DeityIconPaths extends MigrationBase {
    static override version = 0.935;

    #getUpdatedPath<TPath extends ImageFilePath | VideoFilePath>(
        path: TPath,
        options?: { type?: string | null; slug?: string | null },
    ): TPath;
    #getUpdatedPath(
        path: string,
        { type = null, slug = null }: { type?: string | null; slug?: string | null } = {},
    ): string {
        if (typeof path !== "string" || !path.startsWith("systems/pf2e/icons/deity/")) return path;
        if (["effect", "feat"].includes(type ?? "") && slug?.match(/-(?:minor|moderate|major)-(?:boon|curse)$/)) {
            const deitySlug = slug.replace(/-(?:minor|moderate|major)-(?:boon|curse)$/, "");
            return `systems/pf2e/icons/deities/${deitySlug}.webp`;
        }
        if (type === "deity" && slug) return `systems/pf2e/icons/deities/${slug}.webp`;
        return "systems/pf2e/icons/default-icons/deity.svg";
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.img = this.#getUpdatedPath(source.img);
        if (source.prototypeToken?.texture?.src) {
            source.prototypeToken.texture.src = this.#getUpdatedPath(source.prototypeToken.texture.src);
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.img = this.#getUpdatedPath(source.img, { type: source.type, slug: source.system.slug });
    }

    override async updateToken(source: TokenSource): Promise<void> {
        source.texture.src &&= this.#getUpdatedPath(source.texture.src);
    }
}
