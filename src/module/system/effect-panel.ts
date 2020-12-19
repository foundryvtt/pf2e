/* global Application, CONST */
import {PF2EActor} from "../actor/actor";
import {PF2eConditionManager} from "../conditions";
import {ConditionData, ConditionDetailsData} from "../item/dataDefinitions";

export class EffectPanel extends Application {

    private timeout: any = null;

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            popOut: false,
            template: 'systems/pf2e/templates/system/effect-panel.html',
        });
    }

    /**
     * Debounced and slightly delayed request to re-render this panel. Necessary for situations where it is not possible
     * to properly wait for promises to resolve before refreshing the UI.
     */
    refresh() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
            this.render(false)
        }, 100);
    }

    getData(options?: any): any {
        const data = super.getData(options);

        data.conditions = [];
        data.effects = [];
        data.actor = EffectPanel.actor;
        if (data.actor) {
            for (const item of data.actor.data.items) {
                if (item.type === 'condition' && item.flags[game.system.id]?.condition) {
                    data.conditions.push(item);
                } else if (item.type === 'effect') {
                    data.effects.push(item);
                }
            }
        }
        data.conditions = PF2eConditionManager.getFlattenedConditions(data.conditions).map(c => {
            c.locked = c.parents.length > 0;
            c.breakdown = EffectPanel.getParentConditionsBreakdown(c.parents);
            return c;
        });

        return data;
    }

    protected activateListeners(html: JQuery | HTMLElement) {
        super.activateListeners(html);

        // handle right-click on condition and effect icons
        $(html).on('contextmenu','[data-item-id]:not([data-item-id=""])', async event => {
            const actor = EffectPanel.actor;
            if (actor.hasPerm(game.user, CONST.ENTITY_PERMISSIONS.OWNER)) {
                const item = actor.items.get(event.currentTarget.dataset.itemId);
                if (item.type === 'condition' && item.getFlag(game.system.id, 'condition')) {
                    const data = item.data.data as ConditionDetailsData;
                    const value = data.value.isValued ? Math.max(data.value.value - 1, 0) : undefined;
                    actor.getActiveTokens().forEach(token => {
                        if (data.value.isValued) {
                            PF2eConditionManager.updateConditionValue(item._id, token, value);
                        } else {
                            PF2eConditionManager.removeConditionFromToken(item._id, token);
                        }
                    });
                } else {
                    actor.deleteEmbeddedEntity('OwnedItem', event.currentTarget.dataset.itemId);
                }
            } else {
                console.debug('Cannot delete condition or effect on actor you do not own.');
            }
        });
    }

    private static get actor(): PF2EActor {
        return canvas.tokens.controlled[0]?.actor ?? game.user.character;
    }

    private static getParentConditionsBreakdown(conditions: ConditionData[]): string {
        let breakdown = '';
        if ((conditions ?? []).length > 0) {
            const list = Array.from(new Set(conditions.map(p => p.name))).sort().join(', ');
            breakdown = `\n${game.i18n.format('PF2E.EffectPanel.AppliedBy', { 'condition-list': list })}.`;
        }
        return breakdown;
    }
}
