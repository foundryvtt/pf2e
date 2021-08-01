import { ActorPF2e } from '@actor/base';
import { EffectData } from '@item/data';
import { ConditionPF2e, EffectPF2e } from '@item/index';
import { ConditionReference, FlattenedCondition } from './condition-manager/types';

export class EffectPanel extends Application {
    /**
     * Debounce and slightly delayed request to re-render this panel. Necessary for situations where it is not possible
     * to properly wait for promises to resolve before refreshing the UI.
     */
    refresh = foundry.utils.debounce(this.render, 100);

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            popOut: false,
            template: 'systems/pf2e/templates/system/effect-panel.html',
        });
    }

    private get actor(): ActorPF2e | null {
        return canvas.tokens.controlled[0]?.actor ?? game.user?.character ?? null;
    }

    override getData(options?: ApplicationOptions): EffectPanelData {
        const data: EffectPanelData = {
            ...super.getData(options),
            actor: this.actor,
            effects: [],
            conditions: [],
        };

        const { itemTypes } = data.actor ?? { itemTypes: { condition: [], effect: [] } };
        for (const effect of itemTypes.effect) {
            const duration = effect.totalDuration;
            const clone = effect.clone({}, { keepId: true }).data;
            if (duration === Infinity) {
                clone.data.expired = false;
                clone.data.remaining = game.i18n.localize('PF2E.EffectPanel.UnlimitedDuration');
            } else {
                const duration = effect.remainingDuration;
                clone.data.expired = duration.expired;
                clone.data.remaining = clone.data.expired
                    ? game.i18n.localize('PF2E.EffectPanel.Expired')
                    : EffectPanel.getRemainingDurationLabel(
                          duration.remaining,
                          clone.data.start.initiative ?? 0,
                          clone.data.duration.expiry,
                      );
            }
            data.effects.push(clone);
        }
        data.conditions = game.pf2e.ConditionManager.getFlattenedConditions(itemTypes.condition).map((condition) => {
            condition.locked = condition.parents.length > 0;
            condition.breakdown = EffectPanel.getParentConditionsBreakdown(condition.parents);
            return condition;
        });

        return data;
    }

    override activateListeners(html: JQuery) {
        super.activateListeners(html);

        // handle right-click on condition and effect icons
        $(html).on('contextmenu', '[data-item-id]:not([data-item-id=""])', async (event) => {
            const actor = this.actor;
            const effect = actor?.items.get(event.currentTarget.dataset.itemId ?? '');
            if (effect instanceof ConditionPF2e) {
                await actor!.decreaseCondition(effect);
            } else if (effect instanceof EffectPF2e) {
                await effect.delete();
            } else {
                // Failover in case of a stale effect
                this.refresh();
            }
        });
    }

    private static getParentConditionsBreakdown(conditions: ConditionReference[]): string {
        let breakdown = '';
        if ((conditions ?? []).length > 0) {
            const list = Array.from(new Set(conditions.map((p) => p.name)))
                .sort()
                .join(', ');
            breakdown = `${game.i18n.format('PF2E.EffectPanel.AppliedBy', { 'condition-list': list })}`;
        }
        return breakdown;
    }

    private static getRemainingDurationLabel(
        remaining: number,
        initiative: number,
        expiry: 'turn-start' | 'turn-end',
    ): string {
        if (remaining >= 63_072_000) {
            // two years
            return game.i18n.format('PF2E.EffectPanel.RemainingDuration.MultipleYears', {
                years: Math.floor(remaining / 31_536_000),
            });
        } else if (remaining >= 31_536_000) {
            // one year
            return game.i18n.localize('PF2E.EffectPanel.RemainingDuration.SingleYear');
        } else if (remaining >= 1_209_600) {
            // two weeks
            return game.i18n.format('PF2E.EffectPanel.RemainingDuration.MultipleWeeks', {
                weeks: Math.floor(remaining / 604_800),
            });
        } else if (remaining > 604_800) {
            // one week
            return game.i18n.localize('PF2E.EffectPanel.RemainingDuration.SingleWeek');
        } else if (remaining >= 172_800) {
            // two days
            return game.i18n.format('PF2E.EffectPanel.RemainingDuration.MultipleDays', {
                days: Math.floor(remaining / 86_400),
            });
        } else if (remaining > 7_200) {
            // two hours
            return game.i18n.format('PF2E.EffectPanel.RemainingDuration.MultipleHours', {
                hours: Math.floor(remaining / 3_600),
            });
        } else if (remaining > 120) {
            // two minutes
            return game.i18n.format('PF2E.EffectPanel.RemainingDuration.MultipleMinutes', {
                minutes: Math.floor(remaining / 60),
            });
        } else if (remaining >= 12) {
            // two rounds
            return game.i18n.format('PF2E.EffectPanel.RemainingDuration.MultipleRounds', {
                rounds: Math.floor(remaining / 6),
            });
        } else if (remaining >= 6) {
            // one round
            return game.i18n.localize('PF2E.EffectPanel.RemainingDuration.SingleRound');
        } else if (remaining >= 2) {
            // two seconds
            return game.i18n.format('PF2E.EffectPanel.RemainingDuration.MultipleSeconds', { seconds: remaining });
        } else if (remaining === 1) {
            // one second
            return game.i18n.localize('PF2E.EffectPanel.RemainingDuration.SingleSecond');
        } else {
            // zero rounds
            const key =
                expiry === 'turn-end'
                    ? 'PF2E.EffectPanel.RemainingDuration.ZeroRoundsExpireTurnEnd'
                    : 'PF2E.EffectPanel.RemainingDuration.ZeroRoundsExpireTurnStart';
            return game.i18n.format(key, { initiative });
        }
    }
}

interface EffectPanelData {
    conditions: FlattenedCondition[];
    effects: EffectData[];
    actor: ActorPF2e | null;
}
