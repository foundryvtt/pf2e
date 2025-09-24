import { ActorPF2e } from "@actor";
import { ActorSizePF2e } from "@actor/data/size.ts";
import type { TokenSource } from "@common/documents/token.d.mts";
import { MigrationBase } from "../base.ts";

/**
 * Token dimensions are read from source data as of V13, leaving some tokens that were resized in memory now at the
 * incorrect size.
 */
export class Migration939SetTokenDimensions extends MigrationBase {
    static override version = 0.939;

    override async updateToken(source: TokenSource, actor: Readonly<ActorPF2e | null>): Promise<void> {
        const actorSize = actor?.system.traits?.size;
        if (!(actorSize instanceof ActorSizePF2e)) return;
        const { width, height } = actorSize.tokenDimensions;
        source.width = width;
        source.height = height;
    }
}
