import { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ImageFilePath } from "@common/constants.d.mts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

const regex = /icons\/commodities\/treasure\/broach-/;

/**
 * In Foundry Version 13, all broach core item images were corrected to brooch.
 * While there are no instances of macro nor token replacements in our system, they may exist in user worlds.
 */
export class Migration938RenameBroochesAndThroned extends MigrationBase {
    static override version = 0.938;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.img = this.#maybeReplace(source.img);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.img = this.#maybeReplace(source.img);
        source.system.rules = source.system.rules.map((r) => recursiveReplaceString(r, (s) => this.#maybeReplace(s)));

        if (source.type === "kit") {
            for (const value of Object.values(source.system.items)) {
                value.img = this.#maybeReplace(value.img);
            }
        }
    }

    override async updateTable(source: foundry.documents.RollTableSource): Promise<void> {
        if (source.img) {
            source.img = this.#maybeReplace(source.img);
        }
        for (const result of source.results ?? []) {
            if (result.img) {
                result.img = this.#maybeReplace(result.img);
            }
        }
    }

    override async updateMacro(source: foundry.documents.MacroSource): Promise<void> {
        if (source.img) {
            source.img = this.#maybeReplace(source.img);
        }
    }

    override async updateToken(tokenData: foundry.documents.TokenSource): Promise<void> {
        if (tokenData.texture?.src) {
            tokenData.texture.src = this.#maybeReplace(tokenData.texture.src);
        }
    }

    #maybeReplace<T extends string | ImageFilePath>(img: T): T {
        return img
            .replace(regex, (match) => match.replace("broach", "brooch"))
            .replace(
                "icons/magic/nature/vines-throned-entwined-glow-green.webp",
                "icons/magic/nature/vines-thorned-entwined-glow-green.webp",
            ) as T;
    }
}
