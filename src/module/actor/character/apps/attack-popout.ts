import type { ApplicationV1HeaderButton } from "@client/appv1/api/application-v1.d.mts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import type { EffectTrait } from "@item/abstract-effect/types.ts";
import { ErrorPF2e, htmlClosest, htmlQuery } from "@util";
import type { CharacterAttack } from "../data.ts";
import type { CharacterPF2e } from "../document.ts";
import type { ElementalBlastConfig } from "../elemental-blast.ts";
import { CharacterSheetPF2e, type CharacterSheetData } from "../sheet.ts";

class AttackPopout<TActor extends CharacterPF2e> extends CharacterSheetPF2e<TActor> {
    type: AttackPopoutOptions["type"] = "strike";
    #itemId = "";
    #slug = "";
    #attack?: CharacterAttack;
    #elementTrait?: EffectTrait;
    #blasts: ElementalBlastConfig[] = [];

    override get template(): string {
        return `${SYSTEM_ROOT}/templates/actors/character/attack-popout.hbs`;
    }

    override get id(): string {
        const id = super.id;
        return this.type === "blast"
            ? `${id}-blast-${this.#elementTrait}`
            : `${id}-${this.type}-${this.#itemId}-${this.#slug}`;
    }

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "attack-popout"],
            submitOnChange: false,
            submitOnClose: false,
            width: 520,
            height: "auto",
            resizable: false,
        };
    }

    get label(): string | null {
        if (this.type === "blast") {
            return this.#blasts.at(0)?.label ?? null;
        }
        return this.#attack?.label ?? null;
    }

    constructor(object: TActor, options: AttackPopoutOptions) {
        super(object, options);

        if (!options.type) {
            throw ErrorPF2e('AttackPopout is missing mandatory "type" option.');
        }

        if (options.type === "blast") {
            if (!options.elementTrait) {
                throw ErrorPF2e('AttackPopout of type "blast" is missing mandatory "elementalTrait" option.');
            }
            this.#elementTrait = options.elementTrait;
        } else {
            if (!options.slug) {
                throw ErrorPF2e('AttackPopout of type "strike" is missing mandatory "slug" option.');
            }
            if (!options.itemId) {
                throw ErrorPF2e('AttackPopout of type "strike" is missing mandatory "itemId" option.');
            }
            this.#slug = options.slug;
            this.#itemId = options.itemId;
        }
        this.type = options.type;
    }

    override async getData(options: ActorSheetOptions): Promise<AttackPopoutData<TActor>> {
        const base = await super.getData(options);

        if (this.type === "blast") {
            base.elementalBlasts = this.#blasts = base.elementalBlasts.filter((b) => b.element === this.#elementTrait);
            base.data.actions = [];
            base.toggles.actions = base.toggles.actions?.filter((t) => t.domain === "elemental-blast") ?? [];
        } else {
            base.elementalBlasts = [];
            if (this.#slug && this.#itemId) {
                this.#attack = base.data.actions.find((a) => a.item.id === this.#itemId && a.slug === this.#slug);
            }
        }

        return {
            ...base,
            attack: this.#attack,
            index: base.data.actions.findIndex((a) => a === this.#attack),
            popoutType: this.type,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // The label is only available after `getData` so the title has to be set here
        const { label } = this;
        if (label) {
            const title = htmlQuery(htmlClosest(html, "div.window-app"), "h4.window-title");
            if (title) {
                title.innerHTML = game.i18n.localize(label);
            }
        }
    }

    protected override _getHeaderButtons(): ApplicationV1HeaderButton[] {
        // Remove all buttons except the close button. `Close` is a core translation key
        return super._getHeaderButtons().filter((b) => b.label === "Close");
    }
}

interface BaseAttackPopoutOptions extends Partial<ActorSheetOptions> {
    type: string;
}

interface StrikePopoutOptions extends BaseAttackPopoutOptions {
    type: "strike" | "area-fire" | "auto-fire";
    slug?: string;
    itemId?: string;
}

interface BlastPopoutOptions extends BaseAttackPopoutOptions {
    type: "blast";
    elementTrait?: EffectTrait;
}

type AttackPopoutOptions = StrikePopoutOptions | BlastPopoutOptions;

interface AttackPopoutData<TActor extends CharacterPF2e> extends CharacterSheetData<TActor> {
    attack?: CharacterAttack;
    index?: number;
    popoutType: AttackPopoutOptions["type"];
}

export { AttackPopout };
