import { ActorPF2e } from "@actor";
import { CriticalHitAndFumbleCards } from "./crit-fumble-cards";
import { ItemPF2e } from "@item";
import { ChatMessageDataPF2e, ChatMessageFlagsPF2e, ChatMessageSourcePF2e, StrikeLookupData } from "./data";
import { TokenDocumentPF2e } from "@scene";
import { traditionSkills, TrickMagicItemEntry } from "@item/spellcasting-entry/trick";
import { UserPF2e } from "@module/user";
import { CheckRoll } from "@system/check";
import { ChatRollDetails } from "./chat-roll-details";
import { StrikeData } from "@actor/data/base";
import { UserVisibilityPF2e } from "@scripts/ui/user-visibility";
import { htmlQuery } from "@util";
import { DamageButtons } from "./listeners/damage-buttons";

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

        if (this.flags.pf2e.context?.type === "damage-roll") {
            return true;
        }

        const isCheck = firstRoll instanceof CheckRoll || firstRoll.dice[0]?.faces === 20;
        const fromRollTable = !!this.flags.core.RollTable;
        return !(isCheck || fromRollTable);
    }

    /** Get the actor associated with this chat message */
    get actor(): ActorPF2e | null {
        return ChatMessagePF2e.getSpeakerActor(this.speaker);
    }

    /** If this is a check or damage roll, it will have target information */
    get target(): { actor: ActorPF2e; token: Embedded<TokenDocumentPF2e> } | null {
        const context = this.flags.pf2e.context;
        if (!context) return null;
        const targetUUID = "target" in context ? context.target?.token : null;
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
        const context = this.flags.pf2e.context;
        return !!context && "isReroll" in context && !!context.isReroll;
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
        // If this is a strike, we usually want the strike's item
        const strike = this._strike;
        if (strike?.item) return strike.item as Embedded<ItemPF2e>;

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

        if (item?.isOfType("spell")) {
            const spellVariant = this.flags.pf2e.spellVariant;
            const castLevel = this.flags.pf2e.casting?.level ?? item.level;
            const modifiedSpell = item.loadVariant({ overlayIds: spellVariant?.overlayIds, castLevel });
            return modifiedSpell ?? item;
        }

        return item;
    }

    /** If this message was for a strike, return the strike. Strikes will change in a future release */
    get _strike(): StrikeData | null {
        const { actor } = this;
        if (!actor?.system.actions) return null;

        // Get the strike index from either the flags or the DOM. In the case of roll macros, it's in the DOM
        const strikeData = ((): Pick<StrikeLookupData, "index" | "altUsage"> | null => {
            if (this.flags.pf2e.strike) return this.flags.pf2e.strike;
            const messageHTML = htmlQuery(ui.chat.element[0], `li[data-message-id="${this.id}"]`);
            const chatCard = htmlQuery(messageHTML, ".chat-card");
            const index = chatCard?.dataset.strikeIndex === undefined ? null : Number(chatCard?.dataset.strikeIndex);
            return typeof index === "number" ? { index } : null;
        })();

        if (strikeData) {
            const { index, altUsage } = strikeData;
            const action = actor.system.actions.at(index) ?? null;
            return altUsage
                ? action?.altUsages?.find((w) => (altUsage === "thrown" ? w.item.isThrown : w.item.isMelee)) ?? null
                : action;
        }

        return null;
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

    override getRollData(): Record<string, unknown> {
        const { actor, item } = this;
        return { ...actor?.getRollData(), ...item?.getRollData() };
    }

    override async getHTML(): Promise<JQuery> {
        const { actor } = this;

        // Enrich flavor, which is skipped by upstream
        if (this.isContentVisible) {
            const rollData = this.getRollData();
            this.flavor = await TextEditor.enrichHTML(this.flavor, { async: true, rollData });
        }

        const $html = await super.getHTML();
        const html = $html[0]!;
        if (!this.flags.pf2e.suppressDamageButtons && this.isDamageRoll && this.isContentVisible) {
            await DamageButtons.listen(this, $html);
        }
        CriticalHitAndFumbleCards.appendButtons(this, $html);

        html.addEventListener("mouseenter", () => this.onHoverIn());
        html.addEventListener("mouseleave", () => this.onHoverOut());

        const sender = html.querySelector<HTMLElement>(".message-sender");
        sender?.addEventListener("click", this.onClickSender.bind(this));
        sender?.addEventListener("dblclick", this.onClickSender.bind(this));

        UserVisibilityPF2e.processMessageSender(this, html);
        if (!actor && this.content) UserVisibilityPF2e.process(html, { document: this });

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

    private onClickSender(event: MouseEvent): void {
        if (!canvas) return;
        const token = this.token?.object;
        if (token?.isVisible && token.isOwner) {
            token.controlled ? token.release() : token.control({ releaseOthers: !event.shiftKey });
            // If a double click, also pan to the token
            if (event.type === "dblclick") {
                const scale = Math.max(1, canvas.stage.scale.x);
                canvas.animatePan({ ...token.center, scale, duration: 1000 });
            }
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

    get user(): UserPF2e;
}

declare namespace ChatMessagePF2e {
    function getSpeakerActor(speaker: foundry.data.ChatSpeakerSource | foundry.data.ChatSpeakerData): ActorPF2e | null;
}

export { ChatMessagePF2e };
