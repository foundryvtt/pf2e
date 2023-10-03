import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemGrantSource } from "@item/data/base.ts";
import { MigrationBase } from "../base.ts";

/** Convert grant flags containing IDs to `ItemGrantData` objects */
export class Migration755GrantIdsToData extends MigrationBase {
    static override version = 0.755;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        for (const item of source.items) {
            if (!item.flags.pf2e) continue;

            const systemFlags: MaybeWithOldGrantFlags = item.flags.pf2e;
            const { grantedBy, itemGrants } = systemFlags;

            if (typeof grantedBy === "string") {
                const granter = source.items.find((i) => i._id === grantedBy);
                if (granter) {
                    systemFlags.grantedBy = { id: grantedBy };
                } else {
                    systemFlags["-=grantedBy"] = null;
                }
            }

            if (Array.isArray(itemGrants)) {
                systemFlags.itemGrants = itemGrants.flatMap((grant): ItemGrantSource | never[] => {
                    if (typeof grant === "string") {
                        const grantee = source.items.find((i) => i._id === grant);
                        return grantee ? { id: grant } : [];
                    } else {
                        return grant;
                    }
                });
            }
        }
    }
}

type MaybeWithOldGrantFlags = {
    grantedBy?: ItemGrantSource | string | null;
    itemGrants?: ItemGrantSource[] | Record<string, ItemGrantSource> | string[];
    "-=grantedBy"?: null;
    "-=itemGrants"?: null;
};
