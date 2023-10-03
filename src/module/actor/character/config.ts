import { CreatureConfig, CreatureConfigData } from "@actor/creature/config.ts";
import { CharacterPF2e } from "./document.ts";

export class CharacterConfig extends CreatureConfig<CharacterPF2e> {
    override async getData(options: Partial<DocumentSheetOptions> = {}): Promise<PCConfigData> {
        const { showBasicUnarmed } = this.actor.flags.pf2e;
        return {
            ...(await super.getData(options)),
            showBasicUnarmed,
        };
    }
}

interface PCConfigData extends CreatureConfigData<CharacterPF2e> {
    showBasicUnarmed: boolean;
}
