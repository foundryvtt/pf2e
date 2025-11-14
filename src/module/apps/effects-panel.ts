import type { ActorPF2e } from "@actor";
import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import { AbstractEffectPF2e, AfflictionPF2e, ConditionPF2e, EffectPF2e } from "@item";
import { PersistentDamageEditor } from "@item/condition/persistent-damage-editor.ts";
import { createTooltipListener } from "@module/sheet/helpers.ts";
import type { TokenDocumentPF2e } from "@scene/token-document/document.ts";
import { ErrorPF2e, createHTMLElement, htmlQuery, htmlQueryAll } from "@util";

export class EffectsPanel extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    get #token(): TokenDocumentPF2e | null {
        return canvas.tokens.controlled.at(0)?.document ?? null;
    }

    get #actor(): ActorPF2e | null {
        return this.#token?.actor ?? game.user?.character ?? null;
    }

    /**
     * Debounce and slightly delayed request to re-render this panel. Necessary for situations where it is not possible
     * to properly wait for promises to resolve before refreshing the UI.
     */
    refresh = fu.debounce(this.render.bind(this), 100);

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "effects-panel",
        tag: "article",
        window: {
            frame: false,
            positioned: false,
        },
        actions: {
            handleClick: {
                handler: this.#onClickHandleClick,
                buttons: [0, 2],
            },
        },
    };

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        main: {
            template: `${SYSTEM_ROOT}/templates/system/effects/panel.hbs`,
            scrollable: [""],
            root: true,
        },
    };

    static async #onClickHandleClick(this: EffectsPanel, event: PointerEvent, effectEl: HTMLDivElement): Promise<void> {
        const actor = this.#actor;
        const itemId = effectEl.dataset.itemId ?? "";
        const effect = actor?.conditions.get(itemId) ?? actor?.items.get(itemId);

        if (event.button === 0) {
            // Increase or render persistent-damage dialog on left click
            if (actor && effect?.isOfType("condition") && effect.slug === "persistent-damage") {
                await effect.onEndTurn({ token: this.#token });
            } else if (effect instanceof AbstractEffectPF2e) {
                await effect.increase();
            }
        } else if (event.button === 2) {
            // Remove effect or decrease its badge value on right-click
            if (effect instanceof AbstractEffectPF2e) {
                await effect.decrease();
            } else {
                // Failover in case of a stale effect
                this.refresh();
            }
        }
    }

    protected override async _prepareContext(): Promise<EffectsPanelViewData> {
        const actor = this.#actor;
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
            afflictions: await this.#getViewData(actor.itemTypes.affliction ?? []),
            conditions: await this.#getViewData(actor.conditions.active),
            effects: await this.#getViewData(actor.itemTypes.effect),
            actor,
            user: { isGM: game.user.isGM },
        };
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
            effects.map(async (effect) => ({
                effect,
                description: (await effect.getDescription()).value,
                remaining: effect instanceof EffectPF2e ? this.#getRemainingDurationLabel(effect) : null,
            })),
        );
    }

    protected override async _onFirstRender(
        context: EffectsPanelViewData,
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        // Add tooltip listener for effects panel entries
        createTooltipListener(this.element, {
            selector: ".effect-item[data-item-id]",
            locked: true,
            direction: "LEFT",
            cssClass: `pf2e effect-info application`,
            align: "top",
            render: async (effectEl) => {
                const actor = this.#actor;
                const itemId = effectEl.dataset.itemId ?? "";
                const effect = actor?.conditions.get(itemId) ?? actor?.items.get(itemId);
                if (!actor || !effect) return null;

                const viewData = (await this.#getViewData([effect]))[0];
                if (!viewData) throw ErrorPF2e("Error creating view data for effect");

                const content = createHTMLElement("div", {
                    innerHTML: await fa.handlebars.renderTemplate(
                        `${SYSTEM_ROOT}/templates/system/effects/tooltip.hbs`,
                        viewData,
                    ),
                }).firstElementChild;
                if (!(content instanceof HTMLElement)) return null;

                content.querySelector("[data-action=recover-persistent-damage]")?.addEventListener("click", () => {
                    if (effect.isOfType("condition")) {
                        effect.rollRecovery();
                    }
                });

                content.querySelector("[data-action=edit]")?.addEventListener("click", () => {
                    if (effect.isOfType("condition") && effect.slug === "persistent-damage") {
                        new PersistentDamageEditor({ actor, selectedItemId: effect.id }).render({ force: true });
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

        return super._onFirstRender(context, options);
    }

    /** Move the panel to the right interface column. */
    override async _onRender(context: object, options: HandlebarsRenderOptions): Promise<void> {
        await super._onRender(context, options);
        const html = this.element;
        if (options?.force) {
            document.getElementById("ui-right-column-1")?.appendChild(html);
        }

        for (const effectEl of htmlQueryAll(html, ".effect-item[data-item-id]")) {
            const iconElem = effectEl.querySelector(":scope > .icon");
            if (!iconElem) continue;

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
    }
}

interface EffectsPanelViewData extends fa.ApplicationRenderContext {
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
