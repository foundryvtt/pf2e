import { CreatureConfig, CreatureConfigContext } from "@actor/creature/config.ts";
import type { CharacterPF2e } from "./document.ts";

export class CharacterConfig extends CreatureConfig<CharacterPF2e> {
    static override PARTS = CharacterConfig.configParts(`systems/${SYSTEM_ID}/templates/actors/character/config.hbs`);

    protected override async _prepareContext(options: fa.api.DocumentSheetRenderOptions): Promise<PCConfigContext> {
        return {
            ...(await super._prepareContext(options)),
            showBasicUnarmed: this.actor.flags[SYSTEM_ID].showBasicUnarmed,
        };
    }
}

interface PCConfigContext extends CreatureConfigContext<CharacterPF2e> {
    showBasicUnarmed: boolean;
}
