import type { ActorPF2e } from '@actor/index';
import { CheckModifiersContext } from '@module/system/check-modifiers-dialog';
import { RollDataPF2e } from '@system/rolls';
import { ChatCards } from './listeners/cards';
import { CriticalHitAndFumbleCards } from './crit-fumble-cards';

export class ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    /** @override */
    async getHTML(): Promise<JQuery> {
        const $html = await super.getHTML();
        ChatCards.listen($html);

        // Append critical hit and fumble card buttons if the setting is enabled
        if (this.isRoll) {
            CriticalHitAndFumbleCards.appendButtons(this, $html);
        }

        return $html;
    }

    protected _onCreate(data: foundry.data.ChatMessageSource, options: DocumentModificationContext, userId: string) {
        super._onCreate(data, options, userId);

        // Handle critical hit and fumble card drawing
        if (this.isRoll && game.settings.get('pf2e', 'drawCritFumble')) {
            CriticalHitAndFumbleCards.handleDraw(this);
        }
    }
}

export interface ChatMessagePF2e {
    readonly data: foundry.data.ChatMessageData<this>;

    /** @todo: change back to getter when prettier updates with syntax support */
    readonly roll: Rolled<Roll<RollDataPF2e>>;

    getFlag(scope: 'core', key: 'RollTable'): unknown;
    getFlag(scope: 'pf2e', key: 'canReroll'): boolean | undefined;
    getFlag(scope: 'pf2e', key: 'damageRoll'): object | undefined;
    getFlag(scope: 'pf2e', key: 'totalModifier'): number | undefined;
    getFlag(scope: 'pf2e', key: 'context'): (CheckModifiersContext & { rollMode: RollMode }) | undefined;
}
