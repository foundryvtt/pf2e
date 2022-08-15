import { ActorPF2e } from "@actor";
import { RollDataPF2e } from "@system/rolls";
import { ChatCards } from "./listeners/cards";
import { CriticalHitAndFumbleCards } from "./crit-fumble-cards";
import { ItemPF2e } from "@item";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { DamageButtons } from "./listeners/damage-buttons";
import { DegreeOfSuccessHighlights } from "./listeners/degree-of-success";
import { ChatMessageDataPF2e, ChatMessageFlagsPF2e, ChatMessageSourcePF2e } from "./data";
import { TokenDocumentPF2e } from "@scene";
import { SetAsInitiative } from "./listeners/set-as-initiative";
import { traditionSkills, TrickMagicItemEntry } from "@item/spellcasting-entry/trick";
import { ErrorPF2e } from "@util";
import { UserPF2e } from "@module/user";
import { CheckRoll } from "@system/check/roll";
import { TextEditorPF2e } from "@system/text-editor";
import { ChatRollDetails } from "./chat-roll-details";

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
        const isDamageRoll = !!this.flags.pf2e.damageRoll;
        const fromRollTable = !!this.flags.core.RollTable;
        const isRoll = isDamageRoll || this.isRoll;
        const isD20 = (isRoll && firstRoll.dice[0]?.faces === 20) || false;
        return isRoll && !(isD20 || fromRollTable);
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

    /** As of Foundry 9.251, players are able to delete their own messages, and GMs are unable to restrict it. */
    protected static override _canDelete(user: UserPF2e): boolean {
        return user.isGM;
    }

    override async getHTML(): Promise<JQuery> {
        // Determine some metadata
        const data = this.toObject(false) as RawObject<ChatMessageDataPF2e>;
        const rollData = { ...this.actor?.getRollData(), ...(this.item?.getRollData() ?? { actor: this.actor }) };
        data.content = await TextEditorPF2e.enrichHTML(this.content, { rollData, async: true });
        const isWhisper = this.whisper.length;

        // Construct message data
        const messageData: ChatMessageRenderData = {
            message: data,
            user: game.user,
            author: this.user,
            alias: this.alias,
            cssClass: [
                this.type === CONST.CHAT_MESSAGE_TYPES.IC ? "ic" : null,
                this.type === CONST.CHAT_MESSAGE_TYPES.EMOTE ? "emote" : null,
                isWhisper ? "whisper" : null,
                this.blind ? "blind" : null,
            ].filterJoin(" "),
            isWhisper: this.whisper.length,
            canDelete: game.user.isGM, // Only GM users are allowed to have the trash-bin icon in the chat log itself
            whisperTo: this.whisper
                .map((u) => {
                    const user = game.users.get(u);
                    return user ? user.name : null;
                })
                .filterJoin(", "),
        };

        // Render message data specifically for ROLL type messages
        if (this.isRoll) {
            await this._renderRollContent(messageData);
        }

        // Define a border color
        if (this.type === CONST.CHAT_MESSAGE_TYPES.OOC) {
            messageData.borderColor = this.user.color;
        }

        // Render the chat message
        const $html = $(await renderTemplate(CONFIG.ChatMessage.template, messageData));

        // Flag expanded state of dice rolls
        if (this._rollExpanded) $html.find(".dice-tooltip").addClass("expanded");

        // Remove spell card owner buttons if the user is not the owner of the spell
        if (this.item?.isOfType("spell") && !this.item.isOwner) {
            $html.find("section.owner-buttons").remove();
        }

        // Remove entire .target-dc and .dc-result elements if they are empty after user-visibility processing
        const targetDC = $html[0].querySelector(".target-dc");
        if (targetDC?.innerHTML.trim() === "") targetDC.remove();
        const dcResult = $html[0].querySelector(".dc-result");
        if (dcResult?.innerHTML.trim() === "") dcResult.remove();

        if (!this.flags.pf2e.suppressDamageButtons && this.isDamageRoll && this.isContentVisible) {
            await DamageButtons.append(this, $html);

            // Clean up styling of old damage messages
            $html.find(".flavor-text > div:has(.tags)").removeAttr("style").attr({ "data-pf2e-deprecated": true });
        }

        CriticalHitAndFumbleCards.appendButtons(this, $html);

        ChatCards.listen($html);
        InlineRollLinks.listen($html);
        DegreeOfSuccessHighlights.listen(this, $html);
        if (canvas.ready) SetAsInitiative.listen($html);

        // Check DC adjusted by circumstance bonuses or penalties
        try {
            const $adjustedDC = $html.find(".adjusted-dc[data-circumstances]");
            if ($adjustedDC.length === 1) {
                const circumstances = JSON.parse($adjustedDC.attr("data-circumstances") ?? "");
                if (!Array.isArray(circumstances)) throw ErrorPF2e("Malformed adjustments array");

                const content = circumstances
                    .map((a: { label: string; value: number }) => {
                        const sign = a.value >= 0 ? "+" : "";
                        return $("<div>").text(`${a.label}: ${sign}${a.value}`);
                    })
                    .reduce(($concatted, $a) => $concatted.append($a), $("<div>"))
                    .prop("outerHTML");

                $adjustedDC.tooltipster({ content, contentAsHTML: true, theme: "crb-hover" });
            }
        } catch (error) {
            if (error instanceof Error) console.error(error.message);
        }

        // Trait and material tooltips
        $html.find(".tag[data-material], .tag[data-slug], .tag[data-trait]").each((_idx, span) => {
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

        /**
         * A hook event that fires for each ChatMessage which is rendered for addition to the ChatLog.
         * This hook allows for final customization of the message HTML before it is added to the log.
         * @function renderChatMessage
         * @memberof hookEvents
         * @param {ChatMessage} message   The ChatMessage document being rendered
         * @param {jQuery} html           The pending HTML as a jQuery object
         * @param {object} data           The input data provided for template rendering
         */
        Hooks.call("renderChatMessage", this, $html, messageData);

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
