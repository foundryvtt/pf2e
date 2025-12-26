import { CreatureConfig, CreatureConfigData } from "@actor/creature/config.ts";
import type { DocumentSheetV1Options } from "@client/appv1/api/document-sheet-v1.d.mts";
import type { CharacterPF2e } from "./document.ts";

export class CharacterConfig extends CreatureConfig<CharacterPF2e> {
    override async getData(options: Partial<DocumentSheetV1Options> = {}): Promise<PCConfigData> {
        return {
            ...(await super.getData(options)),
            showBasicUnarmed: this.actor.flags[SYSTEM_ID].showBasicUnarmed,
        };
    }
}

interface PCConfigData extends CreatureConfigData<CharacterPF2e> {
    showBasicUnarmed: boolean;
}
