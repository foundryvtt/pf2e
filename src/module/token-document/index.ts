import { ActorPF2e, NPCPF2e } from '@actor/index';
import { TokenPF2e } from '../canvas/token';
import { RuleElements } from '../rules/rules';
import { ScenePF2e } from '../scene';
import { UserPF2e } from '../user';
import { TokenConfigPF2e } from './sheet';

export class TokenDocumentPF2e extends TokenDocument<ActorPF2e> {
    /** This should be in Foundry core, but ... */
    get scene(): ScenePF2e | null {
        return this.parent;
    }

    /** Call `onCreateToken` hook of any rule element on this actor's items */
    protected override async _preCreate(
        data: PreDocumentId<this['data']['_source']>,
        options: DocumentModificationContext,
        user: UserPF2e,
    ): Promise<void> {
        super._preCreate(data, options, user);

        const actor = game.actors.get(data.actorId ?? '');
        if (actor) {
            actor.items.forEach((item) => {
                const rules = RuleElements.fromRuleElementData(item.data.data.rules ?? [], item.data);
                for (const rule of rules) {
                    if (rule.ignored) continue;
                    rule.onCreateToken(actor.data, item.data, data);
                }
            });
        }
    }

    /** Synchronous actor attitude with token disposition, refresh the EffectPanel */
    protected override _onUpdate(
        changed: DeepPartial<this['data']['_source']>,
        options: DocumentModificationContext,
        userId: string,
    ) {
        super._onUpdate(changed, options, userId);

        if (this.actor instanceof NPCPF2e && typeof changed.disposition === 'number' && game.userId === userId) {
            this.actor.updateAttitudeFromDisposition(changed.disposition);
        }

        game.pf2e.effectPanel.refresh();
    }
}

export interface TokenDocumentPF2e {
    readonly _object: TokenPF2e | null;

    readonly parent: ScenePF2e | null;

    _sheet: TokenConfigPF2e | null;
}
