import { ItemPF2e } from "@item";
import { UserPF2e } from "@module/user";
import { DeityData } from "./data";
import { DeitySheetPF2e } from "./sheet";

class DeityPF2e extends ItemPF2e {
    static override get schema(): typeof DeityData {
        return DeityData;
    }

    override prepareActorData(this: Embedded<DeityPF2e>): void {
        if (!this.actor.isOfType("character")) {
            // This should never happen, but ...
            this.delete({ render: false });
            return;
        }

        this.actor.deity = this;

        const { deities } = this.actor.data.data.details;
        const systemData = this.data.data;
        deities.primary = {
            alignment: deepClone(systemData.alignment),
            skill: deepClone(systemData.skill),
            weapons: systemData.weapons.flatMap((w) =>
                w in CONFIG.PF2E.baseWeaponTypes ? { option: w, label: CONFIG.PF2E.baseWeaponTypes[w] } : []
            ),
        };
    }

    /** For now there is support for PCs having a single patron deity */
    override async _preCreate(
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        const existing = this.actor?.itemTypes.deity ?? [];
        if (existing.length > 0) {
            const ids = existing.map((h) => h.id);
            await this.actor?.deleteEmbeddedDocuments("Item", ids, { render: false });
        }
        await super._preCreate(data, options, user);
    }
}

interface DeityPF2e extends ItemPF2e {
    readonly data: DeityData;

    readonly _sheet: DeitySheetPF2e;
}

export { DeityPF2e };
