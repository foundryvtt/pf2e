import { ActorPF2e } from "@actor";
import { RollDataPF2e } from "@system/rolls";
import { CriticalHitAndFumbleCards } from "./crit-fumble-cards";
import { ItemPF2e } from "@item";
import { ChatMessageDataPF2e, ChatMessageFlagsPF2e, ChatMessageSourcePF2e } from "./data";
import { TokenDocumentPF2e } from "@scene";
import { traditionSkills, TrickMagicItemEntry } from "@item/spellcasting-entry/trick";
import { UserPF2e } from "@module/user";
import { CheckRoll } from "@system/check/roll";
import { ChatRollDetails } from "./chat-roll-details";
import { htmlQuery } from "@util";
import { StrikeData } from "@actor/data/base";

class ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    /** The chat log doesn't wait for data preparation before rendering, so set some data in the constructor */
    constructor(
        data: DeepPartial<ChatMessageSourcePF2e> = {},
        context: DocumentConstructionContext<ChatMessagePF2e> = {}
    ) {
        data.flags = mergeObject(expandObject(data.flags ?? {}), { core: {}, pf2e: {} });
        super(data, context);

        // Backward compatibility for roll messages prior to `rollerId` (user ID) being stored with the roll
        for (const roll of this.rolls) {
            if (roll instanceof CheckRoll) {
                roll.roller ??= this.user ?? null;
            }
        }
    }

    /** Is this a damage (or a manually-inputed non-D20) roll? */
    get isDamageRoll(): boolean {
        const firstRoll = this.rolls.at(0);
        if (!firstRoll || firstRoll.terms.some((t) => t instanceof FateDie || t instanceof Coin)) {
            return false;
        }
        const fromRollTable = !!this.flags.core.RollTable;
        const isD20 = firstRoll.dice[0]?.faces === 20 || !!this.flags.pf2e.context;
        return !(isD20 || fromRollTable);
    }

    /** Get the actor associated with this chat message */
    get actor(): ActorPF2e | null {
        return ChatMessagePF2e.getSpeakerActor(this.speaker);
    }

    /** If this is a check or damage roll, it will have target information */
    get target(): { actor: ActorPF2e; token: Embedded<TokenDocumentPF2e> } | null {
        const targetUUID = this.flags.pf2e.context?.target?.token;
        if (!targetUUID) return null;

        const match = /^Scene\.(\w+)\.Token\.(\w+)$/.exec(targetUUID ?? "") ?? [];
        const scene = game.scenes.get(match[1] ?? "");
        const token = scene?.tokens.get(match[2] ?? "");
        const actor = token?.actor;

        return actor ? { actor, token } : null;
    }

    /** If the message came from dynamic inline content in a journal entry, the entry's ID may be used to retrieve it */
    get journalEntry(): JournalEntry | null {
        const uuid = this.flags.pf2e.journalEntry;
        if (!uuid) return null;

        const entryId = /^JournalEntry.([A-Za-z0-9]{16})$/.exec(uuid)?.at(1);
        return game.journal.get(entryId ?? "") ?? null;
    }

    /** Does this message include a check (1d20 + c) roll? */
    get isCheckRoll(): boolean {
        return this.rolls[0] instanceof CheckRoll;
    }

    /** Does the message include a rerolled check? */
    get isReroll(): boolean {
        return !!this.flags.pf2e.context?.isReroll;
    }

    /** Does the message include a check that hasn't been rerolled? */
    get isRerollable(): boolean {
        const roll = this.rolls[0];
        return !!(
            this.actor?.isOwner &&
            this.canUserModify(game.user, "update") &&
            roll instanceof CheckRoll &&
            roll.isRerollable
        );
    }

    /** Get the owned item associated with this chat message */
    get item(): Embedded<ItemPF2e> | null {
        const item = (() => {
            const domItem = this.getItemFromDOM();
            if (domItem) return domItem;

            const origin = this.flags.pf2e?.origin ?? null;
            const match = /Item\.(\w+)/.exec(origin?.uuid ?? "") ?? [];
            return this.actor?.items.get(match?.[1] ?? "") ?? null;
        })();
        if (!item) return null;

        // Assign spellcasting entry, currently only used for trick magic item
        const { tradition } = this.flags.pf2e?.casting ?? {};
        const isCharacter = item.actor.isOfType("character");
        if (tradition && item.isOfType("spell") && !item.spellcasting && isCharacter) {
            const trick = new TrickMagicItemEntry(item.actor, traditionSkills[tradition]);
            item.trickMagicEntry = trick;
        }

        const spellVariant = this.flags.pf2e.spellVariant;
        if (spellVariant && item?.isOfType("spell")) {
            return item.loadVariant({
                overlayIds: spellVariant.overlayIds,
            });
        }

        return item;
    }

    /** If this message was for a strike, return the strike. Strikes will change in a future release */
    get _strike(): StrikeData | null {
        const actor = this.actor;
        const altUsage = this.flags.pf2e.context?.altUsage ?? null;
        if (!actor?.isOfType("character", "npc")) return null;

        const messageHTML = htmlQuery(ui.chat.element[0], `li[data-message-id="${this.id}"]`);
        const chatCard = htmlQuery(messageHTML, ".chat-card, .message-buttons");
        if (!chatCard || chatCard.dataset.strikeIndex === undefined) return null;

        const strikeIndex = Number(chatCard?.dataset.strikeIndex);
        const action = actor.system.actions.at(strikeIndex) ?? null;

        return altUsage
            ? action?.altUsages?.find((w) => (altUsage === "thrown" ? w.item.isThrown : w.item.isMelee)) ?? null
            : action;
    }

    /** Get stringified item source from the DOM-rendering of this chat message */
    getItemFromDOM(): Embedded<ItemPF2e> | null {
        const $domMessage = $("ol#chat-log").children(`li[data-message-id="${this.id}"]`);
        const sourceString = $domMessage.find("div.pf2e.item-card").attr("data-embedded-item") ?? "null";
        try {
            const itemSource = JSON.parse(sourceString);
            const item = itemSource
                ? new ItemPF2e(itemSource, {
                      parent: this.actor,
                      fromConsumable: this.flags?.pf2e?.isFromConsumable,
                  })
                : null;
            return item as Embedded<ItemPF2e> | null;
        } catch (_error) {
            return null;
        }
    }

    async showDetails() {
        if (!this.flags.pf2e.context) return;
        new ChatRollDetails(this).render(true);
    }

    /** Get the token of the speaker if possible */
    get token(): Embedded<TokenDocumentPF2e> | null {
        if (!game.scenes) return null;
        const sceneId = this.speaker.scene ?? "";
        const tokenId = this.speaker.token ?? "";
        return game.scenes.get(sceneId)?.tokens.get(tokenId) ?? null;
    }

    override async getHTML(): Promise<JQuery> {
        if (this.isContentVisible) {
            const rollData = { ...this.actor?.getRollData(), ...(this.item?.getRollData() ?? { actor: this.actor }) };
            this.flavor = await TextEditor.enrichHTML(this.flavor, { async: true, rollData });
        } else {
            // This makes the flavor fall back to "privately rolled some dice"
            this.flavor = "";
        }

        const $html = await super.getHTML();
        $html.on("mouseenter", () => this.onHoverIn());
        $html.on("mouseleave", () => this.onHoverOut());
        $html.find(".message-sender").on("click", this.onClick.bind(this));

        return $html;
    }

    private onHoverIn(): void {
        if (!canvas.ready) return;
        const token = this.token?.object;
        if (token?.isVisible && !token.controlled) {
            token.emitHoverIn();
        }
    }

    private onHoverOut(): void {
        if (canvas.ready) this.token?.object?.emitHoverOut();
    }

    private onClick(event: JQuery.ClickEvent): void {
        event.preventDefault();
        const token = this.token?.object;
        if (token?.isVisible) {
            token.controlled ? token.release() : token.control({ releaseOthers: !event.shiftKey });
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

    flags: ChatMessageFlagsPF2e;

    blind: this["data"]["blind"];
    type: this["data"]["type"];
    whisper: this["data"]["whisper"];

    get roll(): Rolled<Roll<RollDataPF2e>>;

    get user(): UserPF2e;
}

declare namespace ChatMessagePF2e {
    function getSpeakerActor(speaker: foundry.data.ChatSpeakerSource | foundry.data.ChatSpeakerData): ActorPF2e | null;
}

export { ChatMessagePF2e };
