import type { CharacterPF2e } from "@actor/character/document.ts";
import type { ApplicationConfiguration } from "@client/applications/_module.d.mts";
import type { ApplicationV2 } from "@client/applications/api/_module.d.mts";
import type { PhysicalItemPF2e, WeaponPF2e } from "@item";
import { getLoadedAmmo } from "@item/weapon/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { ValueAndMax } from "@module/data.ts";
import { BasePhysicalItemViewData, getBasePhysicalItemViewData } from "@module/sheet/helpers.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { getActionGlyph } from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import Root from "./app.svelte";

interface ReloadWeaponConfiguration extends ApplicationConfiguration {
    weapon: WeaponPF2e<CharacterPF2e>;
}

class WeaponReloader extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<ReloadWeaponConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ReloadWeaponConfiguration> = {
        id: "reload-weapon",
        classes: ["application", "absolute", "themed", "theme-dark"],
        tag: "aside",
        position: {
            width: 400,
            height: "auto",
        },
        window: {
            frame: false,
        },
    };

    override root = Root;

    declare options: ReloadWeaponConfiguration;

    #targetElement: HTMLElement | null = null;
    #closeSignal = new AbortController();

    /** Interval for the position loop. Replace with awaiting on a re-render once the sheets are all appv2 */
    #interval = 0;

    /** A special close if clicked outside listener, pre-bound to "this" for add/remove support */
    #closeListener = (evt: MouseEvent | KeyboardEvent) => {
        if (evt instanceof KeyboardEvent && evt.key === "Escape") {
            evt.stopPropagation();
            this.close();
        } else if (
            evt instanceof MouseEvent &&
            evt.target instanceof HTMLElement &&
            evt.target.closest(".application") !== this.element
        ) {
            this.close();
        }
    };

    get glyph(): string | null {
        const weapon = this.options.weapon;
        const numActions = weapon.system.traits.value.includes("repeating") ? 3 : Number(weapon.reload);
        return numActions > 0 && Number.isInteger(numActions) ? getActionGlyph(numActions) : null;
    }

    async activate(element: HTMLElement): Promise<this> {
        this.#targetElement = element;
        await this.render({ force: true });
        return this;
    }

    protected override async _prepareContext(): Promise<ReloadWeaponContext> {
        const weapon = this.options.weapon;
        const actor = weapon.actor;

        const compatible = [
            ...actor.itemTypes.ammo.filter((i) => !i.isStowed),
            ...actor.itemTypes.weapon.filter((w) => w.system.usage.canBeAmmo),
        ].filter((a) => a.isAmmoFor(weapon));
        const loaded = getLoadedAmmo(weapon);

        return {
            foundryApp: this,
            state: {
                loaded: {
                    value: loaded.length,
                    max: weapon.system.ammo?.capacity ?? 1,
                },
                weapon: getBasePhysicalItemViewData(weapon),
                compatible: R.sortBy(
                    compatible.map((c) => ({
                        ...getBasePhysicalItemViewData(c),
                        quantity: c.quantity,
                        uses: c.isOfType("ammo") && c.uses.max > 1 ? c.uses : null,
                        depleted: c.quantity === 0 || (c.isOfType("ammo") && c.uses.value === 0),
                    })),
                    (c) => (c.depleted ? 1 : 0),
                ),
            },
        };
    }

    override async _onRender(context: object, options: fa.ApplicationRenderOptions): Promise<void> {
        await super._onRender(context, options);
        this.#reposition();
    }

    async reloadWeapon(ammoId: string, all = false): Promise<void> {
        const weapon = this.options.weapon;
        const ammo = weapon.actor.inventory.get(ammoId, { strict: true });

        const capacity = weapon.system.ammo?.capacity ?? 0;
        const loaded = getLoadedAmmo(weapon).filter(
            (a) => !(a.isOfType("ammo") && a.isMagazine && a.system.uses.value === 0),
        );
        const numLoaded = R.sumBy(loaded, (l) => l.quantity);
        const remainingSpace = Math.max(0, capacity - numLoaded);
        const quantity = all ? Math.min(remainingSpace, ammo.quantity) : 1;
        if (remainingSpace > 0) {
            await weapon.attach(ammo, { quantity, stack: true });
            await this.#sendMessage(ammo);
        }

        // Check if we need to close
        const weaponAmmo = weapon.system.ammo;
        if (weaponAmmo?.capacity && numLoaded + quantity >= weaponAmmo.capacity) {
            await this.close();
        }
    }

    /**
     * Sends an action message for the reload.
     * @todo Consider a way for macro activated reloads to also send a message, perhaps by making reload a differently-rendered aux action.
     */
    async #sendMessage(ammo: PhysicalItemPF2e) {
        const weapon = this.options.weapon;
        const actor = weapon.actor;
        if (!game.combat || !actor) return;

        const templates = {
            flavor: `./${SYSTEM_ROOT}/templates/chat/action/flavor.hbs`,
            content: `./${SYSTEM_ROOT}/templates/chat/action/content.hbs`,
        };
        const actionKey = "Interact";
        const annotationKey = "Reload";
        const flavorAction = {
            title: `PF2E.Actions.${actionKey}.Title`,
            subtitle: `PF2E.Actions.${actionKey}.${annotationKey}.Title`,
            glyph: this.glyph,
        };

        const traits = [traitSlugToObject("manipulate", CONFIG.PF2E.actionTraits)];
        const message = `PF2E.Actions.${actionKey}.${annotationKey}.Description`;

        const flavor = await fa.handlebars.renderTemplate(templates.flavor, { action: flavorAction, traits });
        const content = await fa.handlebars.renderTemplate(templates.content, {
            imgPath: weapon.img,
            message: game.i18n.format(message, {
                actor: actor.name,
                weapon: weapon.name,
                ammo: ammo.name,
            }),
        });

        const token = actor.getActiveTokens(false, true).shift();
        await ChatMessagePF2e.create({
            content,
            speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
            flavor,
            style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
        });
    }

    #reposition() {
        const anchorId = this.#targetElement?.dataset.anchorId;
        this.#targetElement = anchorId ? document.querySelector(`[data-anchor-id="${anchorId}"]`) : null;
        if (this.#targetElement && this.element.parentElement) {
            const bounds = this.#targetElement.getBoundingClientRect();
            const pad = fh.interaction.TooltipManager.TOOLTIP_MARGIN_PX;
            this.setPosition({ left: bounds.left, top: bounds.bottom + pad });
        }
    }

    override async _onFirstRender(
        context: ReloadWeaponConfiguration,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.options.weapon.actor.apps[this.id] = this;
        const signal = this.#closeSignal.signal;
        document.addEventListener("click", this.#closeListener, { capture: true, signal });
        document.addEventListener("wheel", this.#closeListener, { capture: true, signal });
        document.addEventListener("keydown", this.#closeListener, { signal });
        this.#interval = window.setInterval(() => this.#reposition(), 200);
    }

    override _onClose(options: fa.ApplicationClosingOptions): void {
        try {
            delete this.options.weapon.actor.apps[this.id];
            super._onClose(options);
        } finally {
            this.#closeSignal.abort();
            clearInterval(this.#interval);
        }
    }
}

interface ReloadWeaponContext extends SvelteApplicationRenderContext {
    foundryApp: WeaponReloader;
    state: {
        loaded: ValueAndMax;
        weapon: BasePhysicalItemViewData;
        compatible: AmmoChoiceViewData[];
    };
}

interface AmmoChoiceViewData extends BasePhysicalItemViewData {
    quantity: number;
    uses: ValueAndMax | null;
    depleted: boolean;
}

export { WeaponReloader };
export type { ReloadWeaponContext };
