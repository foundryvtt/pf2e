/* global canvas, game */
import { PF2EActor } from '../actor/actor';
import { PF2eConditionManager } from '../conditions';
import { ConditionData, ConditionDetailsData, EffectData } from '../item/dataDefinitions';

interface EffectPanelData {
    conditions?: ConditionData[];
    effects?: EffectData[];
    actor?: PF2EActor;
}

export class EffectPanel extends Application {
    actor?: any;

    private static readonly UNITS = Object.freeze({
        rounds: 6,
        minutes: 60,
        hours: 3600,
        days: 86400,
    });

    private timeout: number | undefined = undefined;

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
            window.clearTimeout(this.timeout);
        }
        this.timeout = window.setTimeout(() => {
            this.render(false);
        }, 100);
    }

    getData(options?: any): EffectPanelData {
        const data: EffectPanelData = super.getData(options);

        data.conditions = [];
        data.effects = [];
        data.actor = EffectPanel.actor;
        if (data.actor) {
            for (const item of data.actor.data.items) {
                if (item.type === 'condition' && item.flags[game.system.id]?.condition) {
                    data.conditions.push(item);
                } else if (item.type === 'effect') {
                    const effect = duplicate(item);
                    const duration = EffectPanel.getEffectDuration(effect);
                    if (duration < 0) {
                        effect.data.expired = false;
                        effect.data.remaining = game.i18n.localize('PF2E.EffectPanel.UnlimitedDuration');
                    } else {
                        const start = effect.data.start?.value ?? 0;
                        const remaining = start + duration - game.time.worldTime;
                        effect.data.expired = remaining <= 0;
                        let initiative = 0;
                        if (
                            remaining === 0 &&
                            game.combat?.data?.active &&
                            game.combat?.turns?.length > game.combat?.turn
                        ) {
                            initiative = game.combat.turns[game.combat.turn].initiative;
                            if (initiative === effect.data.start.initiative) {
                                if (effect.data.duration.expiry === 'turn-start') {
                                    effect.data.expired = true;
                                } else if (effect.data.duration.expiry === 'turn-end') {
                                    effect.data.expired = false;
                                } else {
                                    // unknown value - default to expired
                                    effect.data.expired = true;
                                    console.warn(
                                        `Unknown value ${effect.data.duration.expiry} for duration expiry field in effect "${effect?.name}".`,
                                    );
                                }
                            } else {
                                effect.data.expired = initiative < effect.data.start.initiative;
                            }
                        }
                        effect.data.remaining = effect.data.expired
                            ? game.i18n.localize('PF2E.EffectPanel.Expired')
                            : EffectPanel.getRemainingDurationLabel(
                                  remaining,
                                  effect.data.start.initiative,
                                  effect.data.duration.expiry,
                              );
                    }
                    data.effects.push(effect);
                }
            }
        }
        data.conditions = PF2eConditionManager.getFlattenedConditions(data.conditions).map((c) => {
            c.locked = c.parents.length > 0;
            c.breakdown = EffectPanel.getParentConditionsBreakdown(c.parents);
            return c;
        });

        return data;
    }

    protected activateListeners(html: JQuery) {
        super.activateListeners(html);

        // handle right-click on condition and effect icons
        $(html).on('contextmenu', '[data-item-id]:not([data-item-id=""])', async (event) => {
            const actor = EffectPanel.actor;
            if (actor.hasPerm(game.user, CONST.ENTITY_PERMISSIONS.OWNER)) {
                const item = actor.items.get(event.currentTarget.dataset.itemId);
                if (item.type === 'condition' && item.getFlag(game.system.id, 'condition')) {
                    const data = item.data.data as ConditionDetailsData;
                    const value = data.value.isValued ? Math.max(data.value.value - 1, 0) : undefined;
                    actor.getActiveTokens().forEach((token) => {
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
            const list = Array.from(new Set(conditions.map((p) => p.name)))
                .sort()
                .join(', ');
            breakdown = `${game.i18n.format('PF2E.EffectPanel.AppliedBy', { 'condition-list': list })}`;
        }
        return breakdown;
    }

    private static getEffectDuration(effect: any): number {
        const { duration } = effect.data;
        if (duration.unit === 'unlimited') {
            return -1;
        } else {
            return duration.value * (this.UNITS[duration.unit] ?? 0);
        }
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
