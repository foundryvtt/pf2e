import { ActorPF2e, CharacterPF2e } from "@actor";
import { RollDataPF2e } from "@system/rolls";
import { ChatCards } from "./listeners/cards";
import { CriticalHitAndFumbleCards } from "./crit-fumble-cards";
import { ItemPF2e, SpellPF2e } from "@item";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links";
import { DamageButtons } from "./listeners/damage-buttons";
import { DegreeOfSuccessHighlights } from "./listeners/degree-of-success";
import { ChatMessageDataPF2e, ChatMessageSourcePF2e } from "./data";
import { TokenDocumentPF2e } from "@scene";
import { SetAsInitiative } from "./listeners/set-as-initiative";
import { UserVisibilityPF2e } from "@scripts/ui/user-visibility";
import { TraditionSkills, TrickMagicItemEntry } from "@item/spellcasting-entry/trick";
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
        if (this.roll instanceof CheckRoll) {
            this.roll.roller ??= this.user ?? null;
        }
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

    /** If this is a check or damage roll, it will have target information */
    get target(): { actor: ActorPF2e; token: Embedded<TokenDocumentPF2e> } | null {
        const targetUUID = this.data.flags.pf2e.context?.target?.token;
        if (!targetUUID) return null;

        const match = /^Scene\.(\w+)\.Token\.(\w+)$/.exec(targetUUID ?? "") ?? [];
        const scene = game.scenes.get(match[1] ?? "");
        const token = scene?.tokens.get(match[2] ?? "");
        const actor = token?.actor;

        return actor ? { actor, token } : null;
    }

    /** If the message came from dynamic inline content in a journal entry, the entry's ID may be used to retrieve it */
    get journalEntry(): JournalEntry | null {
        const uuid = this.data.flags.pf2e.journalEntry;
        if (!uuid) return null;

        const entryId = /^JournalEntry.([A-Za-z0-9]{16})$/.exec(uuid)?.at(1);
        return game.journal.get(entryId ?? "") ?? null;
    }

    /** Does this message include a check (1d20 + c) roll? */
    get isCheckRoll(): boolean {
        return this.roll instanceof CheckRoll;
    }

    /** Does the message include a rerolled check? */
    get isReroll(): boolean {
        return !!this.data.flags.pf2e.context?.isReroll;
    }

    /** Does the message include a check that hasn't been rerolled? */
    get isRerollable(): boolean {
        const { roll } = this;
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

            const origin = this.data.flags.pf2e?.origin ?? null;
            const match = /Item\.(\w+)/.exec(origin?.uuid ?? "") ?? [];
            return this.actor?.items.get(match?.[1] ?? "") ?? null;
        })();

        // Assign spellcasting entry, currently only used for trick magic item
        const { tradition } = this.data.flags.pf2e?.casting ?? {};
        const isCharacter = item && item.actor instanceof CharacterPF2e;
        if (tradition && item instanceof SpellPF2e && !item.spellcasting && isCharacter) {
            const trick = new TrickMagicItemEntry(item.actor, TraditionSkills[tradition]);
            item.trickMagicEntry = trick;
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
                      fromConsumable: this.data.flags?.pf2e?.isFromConsumable,
                  })
                : null;
            return item as Embedded<ItemPF2e> | null;
        } catch (_error) {
            return null;
        }
    }

    async showDetails() {
        if (!this.data.flags.pf2e.context) return;
        new ChatRollDetails(this).render(true);
    }

    /** Get the token of the speaker if possible */
    get token(): Embedded<TokenDocumentPF2e> | null {
        if (!game.scenes) return null;
        const sceneId = this.data.speaker.scene ?? "";
        const tokenId = this.data.speaker.token ?? "";
        return game.scenes.get(sceneId)?.tokens.get(tokenId) ?? null;
    }

    /** As of Foundry 9.251, players are able to delete their own messages, and GMs are unable to restrict it. */
    protected static override _canDelete(user: UserPF2e): boolean {
        return user.isGM;
    }

    override prepareData(): void {
        super.prepareData();

        const rollData = { ...this.actor?.getRollData(), ...(this.item?.getRollData() ?? { actor: this.actor }) };
        this.data.update({ content: TextEditorPF2e.enrichHTML(this.data.content, { rollData }) });
    }

    override async getHTML(): Promise<JQuery> {
        const $html = await super.getHTML();

        // Show/Hide GM only sections, DCs, and other such elements
        UserVisibilityPF2e.process($html, { message: this });

        // Remove entire .target-dc and .dc-result elements if they are empty after user-visibility processing
        const targetDC = $html[0].querySelector(".target-dc");
        if (targetDC?.innerHTML.trim() === "") targetDC.remove();
        const dcResult = $html[0].querySelector(".dc-result");
        if (dcResult?.innerHTML.trim() === "") dcResult.remove();

        if (!this.data.flags.pf2e.suppressDamageButtons && this.isDamageRoll && this.isContentVisible) {
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

        return $html;
    }

    private onHoverIn(): void {
        if (!canvas.ready) return;
        const token = this.token?.object;
        if (token?.isVisible && !token.isControlled) {
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

    get user(): UserPF2e;
}

declare namespace ChatMessagePF2e {
    function getSpeakerActor(speaker: foundry.data.ChatSpeakerSource | foundry.data.ChatSpeakerData): ActorPF2e | null;
}

export { ChatMessagePF2e };
