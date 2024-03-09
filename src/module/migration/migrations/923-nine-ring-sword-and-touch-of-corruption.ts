import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";
import { SpellPF2e } from "@item";
import { setHasElement } from "@util";
import { UUIDUtils } from "@util/uuid.ts";

/** Replace all uses of nine-ring-sword to jiu-huan-do. */
export class Migration923NineRingSwordAndTouchOfCorruption extends MigrationBase {
    static override version = 0.923;

    #replaceStrings<TObject extends object>(data: TObject): TObject {
        return recursiveReplaceString(data, (s) =>
            s
                // Slug and UUID
                .replace(/^nine-ring-sword$/, "jiu-huan-do")
                .replace(/^ekGHLJSHGgWMUwkY$/, "jFmWSIpJGGebim6y"),
        );
    }

    private spellUUID: Set<CompendiumUUID> = new Set([
        "Compendium.pf2e.spells-srd.Item.jFmWSIpJGGebim6y", // Touch of Corruption
    ]);

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
    }

    private spells = UUIDUtils.fromUUIDs([...this.spellUUID]);

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);

        if (!(source.type === "spell" && setHasElement(this.spellUUID, source.flags.core?.sourceId))) {
            return;
        }

        const spells: unknown[] = await this.spells;
        const spell = spells.find((s): s is SpellPF2e => s instanceof SpellPF2e && s.slug === source.system.slug);

        if (spell) source.system.description.value = spell.description;
    }
}
