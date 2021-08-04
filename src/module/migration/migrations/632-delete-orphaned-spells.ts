import { MigrationBase } from "../base";
import { SpellcastingEntrySource, SpellSource } from "@item/data";
import { ActorSourcePF2e } from "@actor/data";

/** Delete owned spells with no corresponding spellcastiong entry */
export class Migration632DeleteOrphanedSpells extends MigrationBase {
    static override version = 0.632;

    override requiresFlush = true;

    override async updateActor(actorData: ActorSourcePF2e) {
        const spells = actorData.items.filter((itemData): itemData is SpellSource => itemData.type === "spell");
        const entries = actorData.items.filter(
            (itemData): itemData is SpellcastingEntrySource => itemData.type === "spellcastingEntry"
        );
        const orphans = spells.filter(
            (spellData) => !entries.some((entryData) => entryData._id === spellData.data.location.value)
        );
        actorData.items = actorData.items.filter((itemData) => !orphans.some((orphan) => orphan._id === itemData._id));
    }
}
