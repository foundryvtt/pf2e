import { ActorPF2e } from "@actor/base";
import { AbstractEffectPF2e, EffectPF2e } from "@item";
import { ConditionReference, FlattenedCondition } from "../system/conditions";
import { EffectExpiryType } from "@item/effect/data";

export class EffectsPanel extends Application {
    private get actor(): ActorPF2e | null {
        return canvas.tokens.controlled[0]?.actor ?? game.user?.character ?? null;
    }

    /**
     * Debounce and slightly delayed request to re-render this panel. Necessary for situations where it is not possible
     * to properly wait for promises to resolve before refreshing the UI.
     */
    refresh = foundry.utils.debounce(this.render, 100);

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "pf2e-effects-panel",
            popOut: false,
            template: "systems/pf2e/templates/system/effects-panel.html",
        });
    }

    override async getData(options?: ApplicationOptions): Promise<EffectsPanelData> {
        const { actor } = this;
        if (!actor || !game.user.settings.showEffectPanel) {
            return { conditions: [], effects: [], actor: null };
        }

        const effects =
            actor.itemTypes.effect.map((effect) => {
                const duration = effect.totalDuration;
                const { system } = effect;
                if (duration === Infinity) {
                    if (system.duration.unit === "encounter") {
                        system.remaining = system.expired
                            ? game.i18n.localize("PF2E.EffectPanel.Expired")
                            : game.i18n.localize("PF2E.EffectPanel.UntilEncounterEnds");
                    } else {
                        system.expired = false;
                        system.remaining = game.i18n.localize("PF2E.EffectPanel.UnlimitedDuration");
                    }
                } else {
                    const duration = effect.remainingDuration;
                    system.expired = duration.expired;
                    system.remaining = system.expired
                        ? game.i18n.localize("PF2E.EffectPanel.Expired")
                        : EffectsPanel.getRemainingDurationLabel(
                              duration.remaining,
                              system.start.initiative ?? 0,
                              system.duration.expiry
                          );
                }
                return effect;
            }) ?? [];

        const conditions = game.pf2e.ConditionManager.getFlattenedConditions(actor.itemTypes.condition).map(
            (condition) => {
                condition.locked = condition.parents.length > 0;
                condition.breakdown = EffectsPanel.getParentConditionsBreakdown(condition.parents);
                return condition;
            }
        );

        return {
            ...(await super.getData(options)),
            actor,
            effects,
            conditions,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        const $icons = $html.find("div[data-item-id]");

        // Remove an effect on right-click
        $icons.on("contextmenu", async (event) => {
            const $target = $(event.currentTarget);
            if ($target.attr("data-locked")) return;

            const actor = this.actor;
            const effect = actor?.items.get($target.attr("data-item-id") ?? "");
            if (effect instanceof AbstractEffectPF2e) {
                await effect.decrease();
            } else {
                // Failover in case of a stale effect
                this.refresh();
            }
        });

        $icons.on("click", async (event) => {
            const $target = $(event.currentTarget);
            if ($target.attr("data-locked")) return;

            const actor = this.actor;
            const effect = actor?.items.get($target.attr("data-item-id") ?? "");
            if (effect instanceof AbstractEffectPF2e) {
                await effect.increase();
            }
        });
    }

    private static getParentConditionsBreakdown(conditions: ConditionReference[]): string {
        if (conditions.length > 0) {
            const list = Array.from(new Set(conditions.map((c) => c.name)))
                .sort()
                .join(", ");
            return game.i18n.format("PF2E.EffectPanel.AppliedBy", { "condition-list": list });
        }

        return "";
    }

    private static getRemainingDurationLabel(
        remaining: number,
        initiative: number,
        expiry: EffectExpiryType | null
    ): string {
        if (remaining >= 63_072_000) {
            // two years
            return game.i18n.format("PF2E.EffectPanel.RemainingDuration.MultipleYears", {
                years: Math.floor(remaining / 31_536_000),
            });
        } else if (remaining >= 31_536_000) {
            // one year
            return game.i18n.localize("PF2E.EffectPanel.RemainingDuration.SingleYear");
        } else if (remaining >= 1_209_600) {
            // two weeks
            return game.i18n.format("PF2E.EffectPanel.RemainingDuration.MultipleWeeks", {
                weeks: Math.floor(remaining / 604_800),
            });
        } else if (remaining > 604_800) {
            // one week
            return game.i18n.localize("PF2E.EffectPanel.RemainingDuration.SingleWeek");
        } else if (remaining >= 172_800) {
            // two days
            return game.i18n.format("PF2E.EffectPanel.RemainingDuration.MultipleDays", {
                days: Math.floor(remaining / 86_400),
            });
        } else if (remaining > 7_200) {
            // two hours
            return game.i18n.format("PF2E.EffectPanel.RemainingDuration.MultipleHours", {
                hours: Math.floor(remaining / 3_600),
            });
        } else if (remaining > 120) {
            // two minutes
            return game.i18n.format("PF2E.EffectPanel.RemainingDuration.MultipleMinutes", {
                minutes: Math.floor(remaining / 60),
            });
        } else if (remaining >= 12) {
            // two rounds
            return game.i18n.format("PF2E.EffectPanel.RemainingDuration.MultipleRounds", {
                rounds: Math.floor(remaining / 6),
            });
        } else if (remaining >= 6) {
            // one round
            return game.i18n.localize("PF2E.EffectPanel.RemainingDuration.SingleRound");
        } else if (remaining >= 2) {
            // two seconds
            return game.i18n.format("PF2E.EffectPanel.RemainingDuration.MultipleSeconds", { seconds: remaining });
        } else if (remaining === 1) {
            // one second
            return game.i18n.localize("PF2E.EffectPanel.RemainingDuration.SingleSecond");
        } else {
            // zero rounds
            const key =
                expiry === "turn-end"
                    ? "PF2E.EffectPanel.RemainingDuration.ZeroRoundsExpireTurnEnd"
                    : "PF2E.EffectPanel.RemainingDuration.ZeroRoundsExpireTurnStart";
            return game.i18n.format(key, { initiative });
        }
    }
}

interface EffectsPanelData {
    conditions: FlattenedCondition[];
    effects: EffectPF2e[];
    actor: ActorPF2e | null;
}
