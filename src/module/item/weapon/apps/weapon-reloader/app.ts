import { CreaturePF2e } from "@actor";
import type { CharacterPF2e } from "@actor/character/document.ts";
import { CreatureSheetPF2e } from "@actor/creature/sheet.ts";
import { type PhysicalItemPF2e, WeaponPF2e } from "@item";
import { getLoadedAmmo } from "@item/weapon/helpers.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { ValueAndMax } from "@module/data.ts";
import { BasePhysicalItemViewData, getBasePhysicalItemViewData } from "@module/sheet/helpers.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { ErrorPF2e, getActionGlyph, htmlClosest } from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import Root from "./app.svelte";

interface WeaponReloaderConfiguration extends fa.ApplicationConfiguration {
    weapon: WeaponPF2e<CharacterPF2e>;
}

class WeaponReloader extends SvelteApplicationMixin<
    AbstractConstructorOf<fa.api.ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<WeaponReloaderConfiguration> }
>(fa.api.ApplicationV2) {
    constructor(options: DeepPartial<WeaponReloaderConfiguration> & { anchor: HTMLElement | null }) {
        super(R.omit(options, ["anchor"]));
        this.#anchorId = options.anchor?.dataset.anchorId ?? null;
        this.#anchorAppId = htmlClosest(options.anchor, "[data-appid]")?.dataset.appid ?? null;
        if (!this.#anchorId) throw ErrorPF2e("Unable to render without anchor element");
    }

    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "weapon-reloader",
        classes: ["application", "absolute"],
        tag: "aside",
        position: { width: 400 },
        window: { frame: false },
    };

    declare options: WeaponReloaderConfiguration;

    override root = Root;

    #closeSignal = new AbortController();

    #anchorAppId: string | null = null;
    #anchorId: string | null = null;
    #hook: number | null = null;

    /** A special close if clicked outside listener, pre-bound to "this" for add/remove support */
    #closeListener = (event: PointerEvent | KeyboardEvent | WheelEvent) => {
        if (event instanceof KeyboardEvent && event.key === "Escape") {
            event.stopPropagation();
            this.close();
        } else if (
            event instanceof PointerEvent &&
            event.target instanceof HTMLElement &&
            event.target.closest(".application") !== this.element
        ) {
            this.close();
        }
    };

    get glyph(): string | null {
        const weapon = this.options.weapon;
        const numActions = weapon.system.traits.value.includes("repeating") ? 3 : Number(weapon.reload);
        return numActions > 0 && Number.isInteger(numActions) ? getActionGlyph(numActions) : null;
    }

    protected override _initializeApplicationOptions(
        options: DeepPartial<fa.ApplicationConfiguration> & Partial<Pick<WeaponReloaderConfiguration, "weapon">>,
    ): fa.ApplicationConfiguration {
        const weapon = options.weapon;
        if (!(weapon instanceof WeaponPF2e) || !weapon.actor?.isOfType("character")) {
            throw ErrorPF2e("Unable to render without weapon");
        }
        return super._initializeApplicationOptions(options);
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
     * @todo Consider a way for macro activated reloads to also send a message, perhaps by making reload a
     *       differently-rendered aux action.
     */
    async #sendMessage(ammo: PhysicalItemPF2e): Promise<void> {
        const weapon = this.options.weapon;
        const actor = weapon.actor;
        if (!game.combat || !actor) return;

        const templates = {
            flavor: `./systems/${SYSTEM_ID}/templates/chat/action/flavor.hbs`,
            content: `./systems/${SYSTEM_ID}/templates/chat/action/content.hbs`,
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
            message: game.i18n.format(message, { actor: actor.name, weapon: weapon.name, ammo: ammo.name }),
        });

        const token = actor.getActiveTokens(false, true).shift();
        await ChatMessagePF2e.create({
            content,
            speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
            flavor,
            style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
        });
    }

    protected override _prePosition(position: fa.ApplicationPosition): void {
        super._prePosition(position);
        const anchorId = this.#anchorId;
        const target = anchorId ? document.querySelector(`[data-anchor-id="${anchorId}"]`) : null;
        if (target && this.element.parentElement) {
            const bounds = target.getBoundingClientRect();
            const pad = fh.interaction.TooltipManager.TOOLTIP_MARGIN_PX;
            position.left = bounds.left;
            position.top = bounds.bottom + pad;
        }
    }

    protected override async _onFirstRender(
        context: WeaponReloaderConfiguration,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.options.weapon.actor.apps[this.id] = this;
        const signal = this.#closeSignal.signal;
        document.addEventListener("click", this.#closeListener, { capture: true, signal });
        document.addEventListener("wheel", this.#closeListener, { capture: true, signal });
        document.addEventListener("keydown", this.#closeListener, { signal });

        this.#hook = Hooks.on("renderCreatureSheetPF2e", (app) => {
            if (String((app as CreatureSheetPF2e<CreaturePF2e>).appId) === this.#anchorAppId) this.setPosition();
        });
    }

    protected override _tearDown(options: fa.ApplicationClosingOptions): void {
        super._tearDown(options);
        this.#closeSignal.abort();
        delete this.options.weapon.actor.apps[this.id];

        if (typeof this.#hook === "number") Hooks.off("renderCreatureSheetPF2e", this.#hook);
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
