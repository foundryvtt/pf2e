import type { ActorPF2e } from "@actor/index";
import { CheckModifiersContext } from "@module/system/check-modifiers-dialog";
import { RollDataPF2e } from "@system/rolls";
import { ChatCards } from "./listeners/cards";
import { CriticalHitAndFumbleCards } from "./crit-fumble-cards";
import { ItemType } from "@item/data";
import { ItemPF2e, SpellPF2e } from "@item";
import { TokenPF2e } from "@module/canvas";
import { ModifierPF2e } from "@module/modifiers";
import { InlineRollsLinks } from "@scripts/ui/inline-roll-links";
import { DamageButtons } from "./listeners/damage-buttons";
import { DegreeOfSuccessHighlights } from "./listeners/degree-of-success";

class ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    /** Is this a damage (or a manually-inputed non-D20) roll? */
    get isDamageRoll(): boolean {
        const damageRoll = this.getFlag("pf2e", "damageRoll");
        const fromRollTable = this.getFlag("core", "RollTable") !== undefined;
        const isRoll = damageRoll || this.isRoll;
        const isD20 = (isRoll && this.roll && this.roll.dice[0]?.faces === 20) || false;
        return isRoll && !(isD20 || fromRollTable);
    }

    /** Get the actor associated with this chat message */
    get actor(): ActorPF2e | null {
        const fromItem = ((): ActorPF2e | null => {
            const origin = this.data.flags.pf2e?.origin ?? null;
            const match = /^(Actor|Scene)\.(\w+)/.exec(origin?.uuid ?? "") ?? [];
            switch (match[1]) {
                case "Actor": {
                    return game.actors.get(match[2]) ?? null;
                }
                case "Scene": {
                    const scene = game.scenes.get(match[2]);
                    const tokenId = /(?<=Token\.)(\w+)/.exec(origin!.uuid)?.[1] ?? "";
                    const token = scene?.tokens.get(tokenId);
                    return token?.actor ?? null;
                }
                default: {
                    return null;
                }
            }
        })();

        return fromItem ?? ChatMessagePF2e.getSpeakerActor(this.data.speaker);
    }

    /** Get the owned item associated with this chat message */
    get item(): Embedded<ItemPF2e> | null {
        const baseItem = (() => {
            const domItem = this.getItemFromDOM();
            if (domItem) return domItem;

            const origin = this.data.flags.pf2e?.origin ?? null;
            const match = /Item\.(\w+)/.exec(origin?.uuid ?? "") ?? [];
            return this.actor?.items.get(match?.[1] ?? "") ?? null;
        })();

        const variantId = this.data.flags.pf2e?.origin?.variantId;
        if (variantId && baseItem instanceof SpellPF2e) {
            return baseItem.loadVariant(variantId);
        }

        return baseItem;
    }

    /** Get stringified item source from the DOM-rendering of this chat message */
    getItemFromDOM(): Embedded<ItemPF2e> | null {
        const $domMessage = $("ol#chat-log").children(`li[data-message-id="${this.id}"]`);
        const sourceString = $domMessage.find("div.pf2e.item-card").attr("data-embedded-item") ?? "null";
        try {
            const itemSource = JSON.parse(sourceString);
            const item = itemSource ? new ItemPF2e(itemSource, { parent: this.actor }) : null;
            return item as Embedded<ItemPF2e> | null;
        } catch (_error) {
            return null;
        }
    }

    /**
     * Avoid triggering Foundry 0.8.8 bug in which a speaker with no alias and a deleted actor can cause and unhandled
     * exception to be thrown
     */
    override get alias(): string {
        const speaker = this.data.speaker;
        return speaker.alias ?? game.actors.get(speaker.actor ?? "")?.name ?? this.user?.name ?? "";
    }

    /** Get the token of the speaker if possible */
    get token(): TokenPF2e | null {
        if (!canvas.ready) return null;
        const tokenId = this.data.speaker.token;
        return canvas.tokens.placeables.find((token) => token.id === tokenId) ?? null;
    }

    override async getHTML(): Promise<JQuery> {
        const $html = await super.getHTML();

        if (this.isDamageRoll) {
            await DamageButtons.append(this, $html);
            CriticalHitAndFumbleCards.appendButtons(this, $html);
        }

        ChatCards.listen($html);
        InlineRollsLinks.listen($html);
        DegreeOfSuccessHighlights.listen(this, $html);

        $html.on("mouseenter", () => this.onHoverIn());
        $html.on("mouseleave", () => this.onHoverOut());
        $html.find(".message-sender").on("click", this.onClick.bind(this));

        return $html;
    }

    private onHoverIn(): void {
        const token = this.token;
        if (token?.isVisible && !token.isControlled) {
            token.emitHoverIn();
        }
    }

    private onHoverOut(): void {
        this.token?.emitHoverOut();
    }

    private onClick(event: JQuery.ClickEvent): void {
        event.preventDefault();
        const token = this.token;
        if (token?.isVisible) {
            token.isControlled ? token.release() : token.control({ releaseOthers: !event.shiftKey });
        }
    }

    protected override _onCreate(
        data: foundry.data.ChatMessageSource,
        options: DocumentModificationContext,
        userId: string
    ) {
        super._onCreate(data, options, userId);

        // Handle critical hit and fumble card drawing
        if (this.isRoll && game.settings.get("pf2e", "drawCritFumble")) {
            CriticalHitAndFumbleCards.handleDraw(this);
        }
    }
}

interface ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    readonly data: ChatMessageDataPF2e<this>;

    get roll(): Rolled<Roll<RollDataPF2e>>;

    getFlag(scope: "core", key: "RollTable"): unknown;
    getFlag(scope: "pf2e", key: "damageRoll"): object | undefined;
    getFlag(scope: "pf2e", key: "modifierName"): string | undefined;
    getFlag(scope: "pf2e", key: "modifiers"): ModifierPF2e[] | undefined;
    getFlag(scope: "pf2e", key: "context"): (CheckModifiersContext & { rollMode: RollMode }) | undefined;
}

declare namespace ChatMessagePF2e {
    function getSpeakerActor(speaker: foundry.data.ChatSpeakerSource | foundry.data.ChatSpeakerData): ActorPF2e | null;
}

interface ChatMessageDataPF2e<T extends ChatMessagePF2e> extends foundry.data.ChatMessageData<T> {
    flags: Record<string, Record<string, unknown>> & {
        pf2e?: {
            context?: (CheckModifiersContext & { rollMode: RollMode }) | undefined;
            origin?: { type: ItemType; uuid: string; variantId?: string } | null;
            modifierName?: string;
            modifiers?: ModifierPF2e[];
        } & Record<string, unknown>;
    };
}

export { ChatMessagePF2e };
