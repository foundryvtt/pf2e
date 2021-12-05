import type { ActorPF2e } from "@actor";
import { CheckModifiersContext, RollDataPF2e } from "@system/rolls";
import { ChatCards } from "./listeners/cards";
import { CriticalHitAndFumbleCards } from "./crit-fumble-cards";
import { ItemPF2e } from "@item";
import { ModifierPF2e } from "@module/modifiers";
import { InlineRollsLinks } from "@scripts/ui/inline-roll-links";
import { DamageButtons } from "./listeners/damage-buttons";
import { DegreeOfSuccessHighlights } from "./listeners/degree-of-success";
import { DamageChatCard } from "@system/damage/chat-card";
import { ChatMessageDataPF2e, ChatMessageSourcePF2e } from "./data";
import { TokenDocumentPF2e } from "@scene";
import { SetAsInitiative } from "./listeners/set-as-initiative";
import { UserVisibility } from "@scripts/ui/user-visibility";

class ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    /** The chat log doesn't wait for data preparation before rendering, so set some data in the constructor */
    constructor(
        data: DeepPartial<ChatMessageSourcePF2e> = {},
        context: DocumentConstructionContext<ChatMessagePF2e> = {}
    ) {
        data.flags = mergeObject(expandObject(data.flags ?? {}), { core: {}, pf2e: {} });
        super(data, context);
    }

    /** Is this a damage (or a manually-inputed non-D20) roll? */
    get isDamageRoll(): boolean {
        if (this.isRoll && this.roll.terms.some((term) => term instanceof FateDie || term instanceof Coin)) {
            return false;
        }
        const isDamageRoll = !!this.data.flags.pf2e.damageRoll;
        const fromRollTable = !!this.data.flags.core.RollTable;
        const isRoll = isDamageRoll || this.isRoll;
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

    /** Does this message include a check (1d20 + c) roll? */
    get isCheckRoll(): boolean {
        return this.isRoll && !!this.data.flags.pf2e.context;
    }

    /** Does the message include a rerolled check? */
    get isReroll(): boolean {
        return !!this.data.flags.pf2e.context?.isReroll;
    }

    /** Does the message include a check that hasn't been rerolled? */
    get isRerollable(): boolean {
        const actorId = this.data.speaker.actor ?? "";
        const isOwner = !!game.actors.get(actorId)?.isOwner;
        return this.isCheckRoll && !this.isReroll && isOwner && this.canUserModify(game.user, "update");
    }

    /** Get the owned item associated with this chat message */
    get item(): Embedded<ItemPF2e> | null {
        const domItem = this.getItemFromDOM();
        if (domItem) return domItem;

        const origin = this.data.flags.pf2e?.origin ?? null;
        const match = /Item\.(\w+)/.exec(origin?.uuid ?? "") ?? [];
        return this.actor?.items.get(match?.[1] ?? "") ?? null;
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
    get token(): TokenDocumentPF2e | null {
        if (!game.scenes) return null;
        const sceneId = this.data.speaker.scene ?? "";
        const tokenId = this.data.speaker.token ?? "";
        return game.scenes.get(sceneId)?.tokens.get(tokenId) ?? null;
    }

    override async getHTML(): Promise<JQuery> {
        const $html = await super.getHTML();

        // Show/Hide GM only sections, DCs, and other such elements
        UserVisibility.process($html, { message: this, actor: this.actor });

        if (this.isDamageRoll && this.isContentVisible) {
            await DamageButtons.append(this, $html);

            // Clean up styling of old damage messages
            $html.find(".flavor-text > div:has(.tags)").removeAttr("style").attr({ "data-pf2e-deprecated": true });
        }

        CriticalHitAndFumbleCards.appendButtons(this, $html);

        ChatCards.listen($html);
        InlineRollsLinks.listen($html);
        DegreeOfSuccessHighlights.listen(this, $html);
        if (canvas.ready) SetAsInitiative.listen($html);

        $html.find(".tag[data-trait]").each((_idx, span) => {
            const $tag = $(span);
            const description = $tag.attr("data-description");
            if (description) {
                $tag.tooltipster({
                    content: game.i18n.localize(description),
                    maxWidth: 400,
                    theme: "crb-hover",
                });
            }
        });

        $html.on("mouseenter", () => this.onHoverIn());
        $html.on("mouseleave", () => this.onHoverOut());
        $html.find(".message-sender").on("click", this.onClick.bind(this));

        return $html;
    }

    private onHoverIn(): void {
        const token = this.token?.object;
        if (token?.isVisible && !token.isControlled) {
            token.emitHoverIn();
        }
    }

    private onHoverOut(): void {
        this.token?.object?.emitHoverOut();
    }

    private onClick(event: JQuery.ClickEvent): void {
        event.preventDefault();
        const token = this.token?.object;
        if (token?.isVisible) {
            token.isControlled ? token.release() : token.control({ releaseOthers: !event.shiftKey });
        }
    }

    protected override async _preCreate(
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext,
        user: foundry.documents.BaseUser
    ): Promise<void> {
        if (this.isDamageRoll && game.settings.get("pf2e", "automation.experimentalDamageFormatting")) {
            await DamageChatCard.preformat(this);
        }
        return super._preCreate(data, options, user);
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

export { ChatMessagePF2e };
