import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { SpellSource, SpellSystemData } from "@item/spell/data.ts";
import { SpellcastingEntrySource, SpellcastingEntrySystemSource } from "@item/spellcasting-entry/data.ts";
import { OneToTen } from "@module/data.ts";
import { MigrationBase } from "../base.ts";

/** Certain actor specific spell properties moved to spell.location such as signature */
export class Migration734SpellLocationPropsAndSignature extends MigrationBase {
    static override version = 0.734;

    override async updateActor(actor: ActorSourcePF2e): Promise<void> {
        const entries = actor.items.filter(
            (item): item is SpellcastingEntrySource => item.type === "spellcastingEntry"
        );
        const spells = actor.items.filter((item): item is SpellSource => item.type === "spell");

        // Handle signature spells. We need to move it from the entry to the spell's location property
        for (const spellSource of spells) {
            const spellData: SpellSystemDataOld = spellSource.system;
            const entrySource = entries.find((entry) => entry._id === spellData.location.value);
            if (!entrySource) continue;

            const entryData: SpellcastingEntrySystemDataOld = entrySource.system;
            if (!entryData.signatureSpells) continue;

            const isSignature = entryData.signatureSpells.value.includes(spellSource._id);
            if (isSignature) {
                spellData.location.signature = true;
            }
        }
    }

    override async updateItem(source: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        // updateItem() runs after updateActor(). We rely on that to do some cleanup on spellcasting entry
        if (source.type === "spellcastingEntry") {
            const data: SpellcastingEntrySystemDataOld = source.system;
            if (data.signatureSpells) {
                delete data.signatureSpells;
                if ("game" in globalThis) {
                    data["-=signatureSpells"] = null;
                }
            }
        }

        if (source.type === "spell") {
            const data: SpellSystemDataOld = source.system;
            if (data.heightenedLevel || data.autoHeightenLevel) {
                // These fields should only exist if there's an actor
                if (actor) {
                    data.location.heightenedLevel = data.heightenedLevel?.value ?? undefined;
                    data.location.autoHeightenLevel = data.autoHeightenLevel?.value ?? undefined;
                }

                delete data.autoHeightenLevel;
                delete data.heightenedLevel;
                if ("game" in globalThis) {
                    data["-=autoHeightenLevel"] = null;
                    data["-=heightenedLevel"] = null;
                }
            }
        }
    }
}

interface SpellcastingEntrySystemDataOld extends SpellcastingEntrySystemSource {
    "-=signatureSpells"?: null;
    signatureSpells?: {
        value: string[];
    };
}

interface SpellSystemDataOld extends SpellSystemData {
    "-=heightenedLevel"?: null;
    heightenedLevel?: {
        value: number;
    };
    "-=autoHeightenLevel"?: null;
    autoHeightenLevel?: {
        value: OneToTen | null;
    };
}
