import { HOMEBREW_TRAIT_KEYS } from "@system/settings/homebrew/data.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Remove "hb_" prefixes from homebrew element slugs. */
export class Migration893NoHBPrefixSettings extends MigrationBase {
    static override version = 0.893;

    override async migrate(): Promise<void> {
        for (const key of HOMEBREW_TRAIT_KEYS) {
            const tags = game.settings.get("pf2e", `homebrew.${key}`);
            if (tags.length === 0) continue;

            const updatedTags = tags.flatMap((tag: { id: string }) => {
                if (R.isObject(tag) && typeof tag.id === "string") {
                    tag.id = tag.id.replace(/^hb_/, "");
                    return tag;
                } else {
                    return [];
                }
            });

            await game.settings.set("pf2e", `homebrew.${key}`, updatedTags);
        }
    }
}
