import type { ActorPF2e } from "@actor";
import { AbstractEffectPF2e, AfflictionPF2e, ConditionPF2e, EffectPF2e } from "@item";
import { PersistentDialog } from "@item/condition/persistent-damage-dialog.ts";
import { createTooltipListener } from "@module/sheet/helpers.ts";
import type { TokenDocumentPF2e } from "@scene/token-document/document.ts";
import { createHTMLElement, ErrorPF2e, htmlQuery, htmlQueryAll } from "@util";

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
    refresh = fu.debounce(this.render.bind(this), 100);

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "pf2e-effects-panel",
            popOut: false,
            template: "systems/pf2e/templates/system/effects/panel.hbs",
            // foundry does not let scrollY be the root component, so we wrap it
            scrollY: [".effects-list"],
        };
    }

    override async getData(options?: ApplicationOptions): Promise<EffectsPanelViewData> {
        const { actor } = this;
        if (!actor || !game.user.settings.showEffectPanel) {
            return {
                afflictions: [],
                conditions: [],
                effects: [],
                actor: null,
                user: { isGM: false },
            };
        }

        return {
            ...(await super.getData(options)),
            afflictions: await this.#getViewData(actor.itemTypes.affliction ?? []),
            conditions: await this.#getViewData(actor.conditions.active),
            effects: await this.#getViewData(actor.itemTypes.effect),
            actor,
            user: { isGM: game.user.isGM },
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        for (const effectEl of htmlQueryAll(html, ".effect-item[data-item-id]")) {
            const actor = this.actor;
            const itemId = effectEl.dataset.itemId ?? "";
            const effect = actor?.conditions.get(itemId) ?? actor?.items.get(itemId);
            const iconElem = effectEl.querySelector(":scope > .icon");
            if (!actor || !effect || !iconElem) continue;

            // Increase or render persistent-damage dialog on left click
            iconElem.addEventListener("click", async () => {
                if (actor && effect.isOfType("condition") && effect.slug === "persistent-damage") {
                    await effect.onEndTurn({ token: this.token });
                } else if (effect instanceof AbstractEffectPF2e) {
                    await effect.increase();
                }
            });

            // Remove effect or decrease its badge value on right-click
            iconElem.addEventListener("contextmenu", async () => {
                if (effect instanceof AbstractEffectPF2e) {
                    await effect.decrease();
                } else {
                    // Failover in case of a stale effect
                    this.refresh();
                }
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
                    ? Math.clamp(parentWidth / textElement.clientWidth, minScale, 1)
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

        // Add tooltip listener for effects panel entries
        createTooltipListener(html, {
            selector: ".effect-item[data-item-id]",
            locked: true,
            direction: "LEFT",
            cssClass: "pf2e effect-info",
            align: "top",
            render: async (effectEl) => {
                const actor = this.actor;
                const itemId = effectEl.dataset.itemId ?? "";
                const effect = actor?.conditions.get(itemId) ?? actor?.items.get(itemId);
                if (!actor || !effect) return null;

                const viewData = (await this.#getViewData([effect]))[0];
                if (!viewData) throw ErrorPF2e("Error creating view data for effect");

                const content = createHTMLElement("div", {
                    innerHTML: await renderTemplate("systems/pf2e/templates/system/effects/tooltip.hbs", viewData),
                }).firstElementChild;
                if (!(content instanceof HTMLElement)) return null;

                content.querySelector("[data-action=recover-persistent-damage]")?.addEventListener("click", () => {
                    if (effect.isOfType("condition")) {
                        effect.rollRecovery();
                    }
                });

                content.querySelector("[data-action=edit]")?.addEventListener("click", () => {
                    if (effect.isOfType("condition") && effect.slug === "persistent-damage") {
                        new PersistentDialog(actor, { editing: effect.id }).render(true);
                    } else {
                        effect.sheet.render(true);
                    }
                });

                // Send effect to chat
                content.querySelector("[data-action=send-to-chat]")?.addEventListener("click", () => {
                    effect.toMessage();
                });

                return content;
            },
        });
    }

    #getRemainingDurationLabel(effect: EffectPF2e): string {
        const system = effect.system;
        if (effect.totalDuration === Infinity) {
            if (system.duration.unit === "encounter") {
                return system.expired
                    ? game.i18n.localize("PF2E.EffectPanel.Expired")
                    : game.i18n.localize("PF2E.EffectPanel.UntilEncounterEnds");
            } else {
                return game.i18n.localize("PF2E.EffectPanel.UnlimitedDuration");
            }
        } else if (system.expired) {
            return game.i18n.localize("PF2E.EffectPanel.Expired");
        }

        const remaining = effect.remainingDuration.remaining;
        const initiative = system.start.initiative ?? 0;
        const expiry = system.duration.expiry;

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

    async #getViewData(effects: AfflictionPF2e[] | EffectPF2e[] | ConditionPF2e[]): Promise<EffectViewData[]> {
        return await Promise.all(
            effects.map(async (effect) => {
                const actor = "actor" in effect ? effect.actor : null;
                return {
                    effect,
                    description: await TextEditor.enrichHTML(effect.description, {
                        rollData: { actor, item: effect },
                    }),
                    remaining: effect instanceof EffectPF2e ? this.#getRemainingDurationLabel(effect) : null,
                };
            }),
        );
    }

    override render(force?: boolean, options?: RenderOptions): this {
        return super.render(force, options);
    }
}

interface EffectsPanelViewData {
    afflictions: EffectViewData[];
    conditions: EffectViewData[];
    effects: EffectViewData[];
    actor: ActorPF2e | null;
    user: { isGM: boolean };
}

interface EffectViewData {
    effect: AbstractEffectPF2e;
    description: string;
    remaining: string | null;
}
