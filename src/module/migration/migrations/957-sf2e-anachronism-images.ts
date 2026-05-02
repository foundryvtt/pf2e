import { ActorSourcePF2e } from "@actor/data/index.ts";
import { TokenSource } from "@common/documents/token.mjs";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/**
 * As of SF2e Anachronism 2.0, images used by sf2e are now part of the repository.
 */
export class Migration957SF2eAnachronismImages extends MigrationBase {
    static override version = 0.957;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.img) source.img = this.#replacePath(source.img);
        if (source.prototypeToken) {
            source.prototypeToken = recursiveReplaceString(source.prototypeToken, (str) => this.#replacePath(str));
        }
    }

    override async updateToken(source: TokenSource): Promise<void> {
        if (source.texture?.src) source.texture.src = this.#replacePath(source.texture.src);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!source.img) return;
        if (source.img) source.img = this.#replacePath(source.img);
        source.system = recursiveReplaceString(source.system, (str) => this.#replacePath(str));
    }

    #replacePath<T extends string>(path: T): T {
        return path
            .replace(
                "modules/sf2e-anachronism/art/icons/feat.webp",
                `systems/${SYSTEM_ID}/icons/default-icons/feats-sf2e.webp`,
            )
            .replace("modules/sf2e-anachronism/art/icons/", `systems/${SYSTEM_ID}/icons/`)
            .replace("modules/sf2e-anachronism/art/", `systems/${SYSTEM_ID}/icons/`) as T;
    }
}
