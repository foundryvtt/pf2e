import { TokenDocumentPF2e } from '@module/token-document';

export class TokenPF2e extends Token<TokenDocumentPF2e> {
    /** ActiveEffect overrides from the actor */
    overrides: DeepPartial<foundry.data.TokenSource> = {};

    /** Used to track conditions and other token effects by game.pf2e.StatusEffects */
    statusEffectChanged = false;

    /** Apply ActiveEffect changes from the actor */
    applyActiveEffects(overrides: DeepPartial<foundry.data.TokenSource> = {}) {
        // Propagate any new or removed ActiveEffect overrides to the token
        if (JSON.stringify(this.overrides) === JSON.stringify(overrides)) return;

        this.overrides = overrides;
        this.data.reset();
        mergeObject(this.data, overrides, { insertKeys: false });

        this.updateSource();
    }
}
