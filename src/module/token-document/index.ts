import { ActorPF2e, LootPF2e, NPCPF2e } from '@actor/index';
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

    /** If rules-based vision is enabled, disable (but don't save) manually configured vision radii */
    override prepareBaseData(): void {
        super.prepareBaseData();

        if (canvas.sight?.rulesBasedVision) {
            this.data.update({ brightSight: 0, dimSight: 0, lightAngle: 360, sightAngle: 360 });
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

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

    /** Toggle token hiding if this token's actor is a loot actor */
    protected override _onCreate(
        data: this['data']['_source'],
        options: DocumentModificationContext,
        userId: string,
    ): void {
        super._onCreate(data, options, userId);
        if (this.actor instanceof LootPF2e) this.actor.toggleTokenHiding();
    }

    /** Synchronize actor attitude with token disposition, refresh the EffectPanel, update perceived light */
    protected override _onUpdate(
        changed: DeepPartial<this['data']['_source']>,
        options: DocumentModificationContext,
        userId: string,
    ): void {
        super._onUpdate(changed, options, userId);

        if (this.actor instanceof NPCPF2e && typeof changed.disposition === 'number' && game.userId === userId) {
            this.actor.updateAttitudeFromDisposition(changed.disposition);
        }

        // Refresh the effect panel if the update isn't a movement
        if (!('x' in changed || 'y' in changed)) game.pf2e.effectPanel.refresh();

        // Refresh perceived light levels
        if ('brightLight' in changed || 'dimLight' in changed) {
            this.object?.applyOverrides();
        }
    }
}

export interface TokenDocumentPF2e {
    readonly _object: TokenPF2e | null;

    readonly parent: ScenePF2e | null;

    _sheet: TokenConfigPF2e | null;
}
