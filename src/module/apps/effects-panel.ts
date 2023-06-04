import { AbstractEffectPF2e, AfflictionPF2e, ConditionPF2e, EffectPF2e } from "@item";
import { EffectExpiryType } from "@item/effect/data.ts";
import { ActorPF2e, TokenDocumentPF2e } from "@module/documents.ts";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links.ts";
import { htmlQuery, htmlQueryAll } from "@util";

export class EffectsPanel extends Application {
    private get token(): TokenDocumentPF2e | null {
        return canvas.tokens.controlled.at(0)?.document ?? null;
    }

    private get actor(): ActorPF2e | null {
        return this.token?.actor ?? game.user?.character ?? null;
    }

    /**
     * Debounce and slightly delayed request to re-render this panel. Necessary for situations where it is not possible
     * to properly wait for promises to resolve before refreshing the UI.
     */
    refresh = foundry.utils.debounce(this.render, 100);

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "pf2e-effects-panel",
            popOut: false,
            template: "systems/pf2e/templates/system/effects-panel.hbs",
        };
    }

    override async getData(options?: ApplicationOptions): Promise<EffectsPanelData> {
        const { actor } = this;
        if (!actor || !game.user.settings.showEffectPanel) {
            return {
                afflictions: [],
                conditions: [],
                effects: [],
                descriptions: { afflictions: [], conditions: [], effects: [] },
                actor: null,
                user: { isGM: false },
            };
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
                        system.remaining = game.i18n.localize("PF2E.EffectPanel.UnlimitedDuration");
                    }
                } else {
                    const duration = effect.remainingDuration;
                    system.remaining = system.expired
                        ? game.i18n.localize("PF2E.EffectPanel.Expired")
                        : this.#getRemainingDurationLabel(
                              duration.remaining,
                              system.start.initiative ?? 0,
                              system.duration.expiry
                          );
                }
                return effect;
            }) ?? [];

        const conditions = actor.conditions.active;
        const afflictions = actor.itemTypes.affliction;

        const descriptions = {
            afflictions: await this.#getEnrichedDescriptions(afflictions),
            conditions: await this.#getEnrichedDescriptions(conditions),
            effects: await this.#getEnrichedDescriptions(effects),
        };

        return {
            ...(await super.getData(options)),
            afflictions,
            conditions,
            descriptions,
            effects,
            actor,
            user: { isGM: game.user.isGM },
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0]!;

        // For inline roll links in descriptions
        InlineRollLinks.listen(html, this.actor || undefined);

        for (const effectEl of htmlQueryAll(html, ".effect-item[data-item-id]")) {
            const itemId = effectEl.dataset.itemId;
            if (!itemId) continue;

            const iconElem = effectEl.querySelector(".icon");
            // Increase or render persistent-damage dialog on left click
            iconElem?.addEventListener("click", async () => {
                const { actor } = this;
                const effect = actor?.items.get(itemId);
                if (actor && effect?.isOfType("condition") && effect.slug === "persistent-damage") {
                    await effect.onEndTurn({ token: this.token });
                } else if (effect instanceof AbstractEffectPF2e) {
                    await effect.increase();
                }
            });

            // Remove effect or decrease its badge value on right-click
            iconElem?.addEventListener("contextmenu", async () => {
                const { actor } = this;
                const effect = actor?.items.get(itemId);
                if (effect instanceof AbstractEffectPF2e) {
                    await effect.decrease();
                } else {
                    // Failover in case of a stale effect
                    this.refresh();
                }
            });

            effectEl.querySelector("[data-action=recover-persistent-damage]")?.addEventListener("click", () => {
                const item = this.actor?.items.get(itemId);
                if (item?.isOfType("condition")) {
                    item.rollRecovery();
                }
            });

            // Send effect to chat
            effectEl.querySelector("[data-action=send-to-chat]")?.addEventListener("click", () => {
                const { actor } = this;
                const effect = actor?.conditions.get(itemId) ?? actor?.items.get(itemId);
                effect?.toMessage();
            });

            // Uses a scale transform to fit the text within the box
            // Note that the value container cannot have padding or measuring will fail.
            // They cannot be inline elements pre-computation, but must be post-computation (for ellipses)
            const valueContainer = htmlQuery(iconElem, ".value");
            const textElement = htmlQuery(valueContainer, "strong");
            if (valueContainer && textElement) {
                const minScale = 0.75;
                const parentWidth = valueContainer.clientWidth;
                const scale = textElement.clientWidth
                    ? Math.clamped(parentWidth / textElement.clientWidth, minScale, 1)
                    : 1;
                if (scale < 1) {
                    valueContainer.style.transformOrigin = "left";
                    valueContainer.style.transform = `scaleX(${scale})`;

                    // Unfortunately, width is pre scaling, so we need to scale it back up
                    // +1 prevents certain scenarios where ellipses will show even above min scale.
                    valueContainer.style.width = `${(1 / scale) * 100 + 1}%`;
                }

                textElement.style.display = "inline";
            }
        }
    }

    #getRemainingDurationLabel(remaining: number, initiative: number, expiry: EffectExpiryType | null): string {
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

    async #getEnrichedDescriptions(effects: AfflictionPF2e[] | EffectPF2e[] | ConditionPF2e[]): Promise<string[]> {
        return await Promise.all(
            effects.map(async (effect) => {
                const actor = "actor" in effect ? effect.actor : null;
                const rollData = { actor, item: effect };
                return await TextEditor.enrichHTML(effect.description, { async: true, rollData });
            })
        );
    }
}

interface EffectsDescriptionData {
    afflictions: string[];
    conditions: string[];
    effects: string[];
}

interface EffectsPanelData {
    afflictions: AfflictionPF2e[];
    conditions: ConditionPF2e[];
    descriptions: EffectsDescriptionData;
    effects: EffectPF2e[];
    actor: ActorPF2e | null;
    user: { isGM: boolean };
}
