import { PhysicalItemPF2e } from "@item/index";
import { LocalizePF2e } from "@module/system/localize";
import { UserPF2e } from "@module/user";
import { ErrorPF2e } from "@util";
import { ActorPF2e } from "./index";

export interface ItemTransferData {
    source: {
        tokenId?: string;
        actorId: string;
        itemId: string;
    };
    target: {
        tokenId?: string;
        actorId: string;
    };
    quantity: number;
    containerId?: string;
}

export class ItemTransfer implements ItemTransferData {
    private templatePaths = {
        flavor: "./systems/pf2e/templates/chat/action/flavor.hbs",
        content: "./systems/pf2e/templates/chat/action/content.hbs",
    };

    constructor(
        public source: ItemTransferData["source"],
        public target: ItemTransferData["target"],
        public quantity: number,
        public containerId?: string
    ) {}

    async request(): Promise<void> {
        const gamemaster = game.users.find((u) => u.isGM && u.active);
        if (!gamemaster) {
            const source = this.getSource();
            const target = this.getTarget();
            const loot = [source, target].find((a) => a?.isLootableBy(game.user) && !a.isOwner);

            if (!(loot instanceof ActorPF2e)) throw ErrorPF2e("Unexpected missing actor");
            const translations = LocalizePF2e.translations.PF2E.loot;
            ui.notifications.error(
                game.i18n.format(translations.GMSupervisionError, { loot: ItemTransfer.tokenName(loot) })
            );
            return;
        }

        console.debug(`PF2e System | Requesting item transfer from GM ${gamemaster.name}`);
        game.socket.emit("system.pf2e", { request: "itemTransfer", data: this });
    }

    // Only a GM can call this method, or else Foundry will block it (or would if we didn't first)
    async enact(requester: UserPF2e): Promise<void> {
        if (!game.user.isGM) {
            throw ErrorPF2e("Unauthorized item transfer");
        }

        console.debug("PF2e System | Enacting item transfer");
        const sourceActor = this.getSource();
        const sourceItem = sourceActor?.items?.find((i) => i.id === this.source.itemId);
        const targetActor = this.getTarget();

        // Sanity checks
        if (
            !(
                sourceActor instanceof ActorPF2e &&
                sourceItem instanceof PhysicalItemPF2e &&
                targetActor instanceof ActorPF2e &&
                sourceActor.isLootableBy(game.user) &&
                targetActor.isLootableBy(game.user)
            )
        ) {
            throw ErrorPF2e("Failed sanity check during item transfer");
        }

        const targetItem = await sourceActor.transferItemToActor(
            targetActor,
            sourceItem,
            this.quantity,
            this.containerId
        );
        const sourceIsLoot = sourceActor.isOfType("loot") && sourceActor.system.lootSheetType === "Loot";

        // A merchant transaction can fail if funds are insufficient, but a loot transfer failing is an error.
        if (!sourceItem && sourceIsLoot) {
            return;
        }

        this.sendMessage(requester, sourceActor, targetActor, targetItem);
    }

    /** Retrieve the full actor from the source or target ID */
    private getActor(tokenId: string | undefined, actorId: string): ActorPF2e | null {
        if (typeof tokenId === "string") {
            const token = canvas.tokens.placeables.find((t) => t.id === tokenId);
            return token?.actor ?? null;
        }
        return game.actors.get(actorId) ?? null;
    }

    private getSource(): ActorPF2e | null {
        return this.getActor(this.source.tokenId, this.source.actorId);
    }

    private getTarget(): ActorPF2e | null {
        return this.getActor(this.target.tokenId, this.target.actorId);
    }

    // Prefer token names over actor names
    private static tokenName(document: ActorPF2e | User): string {
        if (document instanceof ActorPF2e) {
            // Synthetic actor: use its token name or, failing that, actor name
            if (document.token) return document.token.name;

            // Linked actor: use its token prototype name
            return document.prototypeToken?.name ?? document.name;
        }
        // User with an assigned character
        if (document.character instanceof ActorPF2e) {
            const token = canvas.tokens.placeables.find((t) => t.actor?.id === document.id);
            return token?.name ?? document.character?.name;
        }

        // User with no assigned character (should never happen)
        return document.name;
    }

    /** Send a chat message that varies on the types of transaction and parties involved
     * @param requester   The player who requested an item transfer to be performed by the GM
     * @param sourceActor The actor from which the item was dragged
     * @param targetActor The actor on which the item was dropped
     * @param item        The item created on the target actor as a result of the drag & drop
     */
    private async sendMessage(
        requester: UserPF2e,
        sourceActor: ActorPF2e,
        targetActor: ActorPF2e,
        item: PhysicalItemPF2e | null
    ): Promise<void> {
        const translations = LocalizePF2e.translations.PF2E.loot;

        if (!item) {
            const sourceIsMerchant = sourceActor.isOfType("loot") && sourceActor.system.lootSheetType === "Merchant";
            if (sourceIsMerchant) {
                const message = translations.InsufficientFundsMessage;
                // The buyer didn't have enough funds! No transaction.

                const content = await renderTemplate(this.templatePaths.content, {
                    imgPath: targetActor.img,
                    message: game.i18n.format(message, { buyer: targetActor.name }),
                });

                const flavor = await this.messageFlavor(sourceActor, targetActor, translations.BuySubtitle);

                await ChatMessage.create({
                    user: requester.id,
                    speaker: { alias: ItemTransfer.tokenName(targetActor) },
                    type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
                    flavor,
                    content,
                });
                return;
            } else {
                throw ErrorPF2e("Unexpected item-transfer failure");
            }
        }

        // Exhaustive pattern match to determine speaker and item-transfer parties
        type PatternMatch = [speaker: string, subtitle: string, formatArgs: Parameters<Game["i18n"]["format"]>];

        const [speaker, subtitle, formatArgs] = ((): PatternMatch => {
            const isMerchant = (actor: ActorPF2e) =>
                actor.isOfType("loot") && actor.system.lootSheetType === "Merchant";
            const isWhat = (actor: ActorPF2e) => ({
                isCharacter: actor.testUserPermission(requester, "OWNER") && actor.isOfType("character"),
                isMerchant: isMerchant(actor),
                isNPC:
                    actor.isOfType("npc") &&
                    actor.isLootableBy(requester) &&
                    !actor.testUserPermission(requester, "OWNER"),
                isLoot:
                    actor.isOfType("loot") &&
                    actor.isLootableBy(requester) &&
                    !actor.testUserPermission(requester, "OWNER") &&
                    !isMerchant(actor),
            });
            const source = isWhat(sourceActor);
            const target = isWhat(targetActor);

            if (source.isCharacter && target.isLoot) {
                // Character deposits item in loot container
                return [
                    ItemTransfer.tokenName(sourceActor),
                    translations.DepositSubtitle,
                    [
                        translations.DepositMessage,
                        {
                            depositor: ItemTransfer.tokenName(sourceActor),
                            container: ItemTransfer.tokenName(targetActor),
                        },
                    ],
                ];
            } else if (source.isCharacter && target.isMerchant) {
                // Character gives item to merchant
                return [
                    ItemTransfer.tokenName(sourceActor),
                    translations.GiveSubtitle,
                    [
                        translations.GiveMessage,
                        { giver: ItemTransfer.tokenName(sourceActor), recipient: ItemTransfer.tokenName(targetActor) },
                    ],
                ];
            } else if (source.isCharacter && target.isNPC) {
                // Character drops item on dead NPC
                return [
                    ItemTransfer.tokenName(sourceActor),
                    translations.PlantSubtitle,
                    [
                        translations.PlantMessage,
                        { planter: ItemTransfer.tokenName(sourceActor), corpse: ItemTransfer.tokenName(targetActor) },
                    ],
                ];
            } else if (source.isLoot && target.isCharacter) {
                // Character takes item from loot container
                return [
                    ItemTransfer.tokenName(targetActor),
                    translations.TakeSubtitle,
                    [
                        translations.TakeMessage,
                        { taker: ItemTransfer.tokenName(targetActor), container: ItemTransfer.tokenName(sourceActor) },
                    ],
                ];
            } else if (source.isNPC && target.isCharacter) {
                // Character takes item from loot container
                return [
                    ItemTransfer.tokenName(targetActor),
                    translations.LootSubtitle,
                    [
                        translations.LootMessage,
                        { looter: ItemTransfer.tokenName(targetActor), corpse: ItemTransfer.tokenName(sourceActor) },
                    ],
                ];
            } else if ([source, target].every((actor) => actor.isLoot || actor.isNPC)) {
                return [
                    // Character transfers item between two loot containers
                    requester.character?.name ?? requester.name,
                    translations.TransferSubtitle,
                    [
                        translations.TransferMessage,
                        {
                            transferrer: requester.character?.name ?? requester.name,
                            fromContainer: ItemTransfer.tokenName(sourceActor),
                            toContainer: ItemTransfer.tokenName(targetActor),
                        },
                    ],
                ];
            } else if (source.isLoot && target.isMerchant) {
                // Character gives item to merchant directly from loot container
                return [
                    requester.character?.name ?? requester.name,
                    translations.GiveSubtitle,
                    [
                        translations.GiveMessage,
                        {
                            seller: requester.character?.name ?? requester.name,
                            buyer: ItemTransfer.tokenName(targetActor),
                        },
                    ],
                ];
            } else if (source.isMerchant && target.isCharacter) {
                // Merchant sells item to character
                return [
                    ItemTransfer.tokenName(sourceActor),
                    translations.SellSubtitle,
                    [
                        translations.SellMessage,
                        { seller: ItemTransfer.tokenName(sourceActor), buyer: ItemTransfer.tokenName(targetActor) },
                    ],
                ];
            } else if (source.isMerchant && target.isLoot) {
                // Merchant sells item to character, who stows it directly in loot container
                return [
                    requester.character?.name ?? requester.name,
                    translations.SellSubtitle,
                    [
                        translations.SellMessage,
                        {
                            seller: ItemTransfer.tokenName(sourceActor),
                            buyer: requester.character?.name ?? requester.name,
                        },
                    ],
                ];
            } else {
                // Possibly to fill out later: Merchant sells item to character directly from loot container
                throw ErrorPF2e("Unexpected item-transfer failure");
            }
        })();
        const formatProperties = formatArgs[1];
        if (!formatProperties) throw ErrorPF2e("Unexpected item-transfer failure");
        formatProperties.quantity = this.quantity;
        formatProperties.item = item.name;

        // Don't bother showing quantity if it's only 1:
        const content = await renderTemplate(this.templatePaths.content, {
            imgPath: item.img,
            message: game.i18n.format(...formatArgs).replace(/\b1 × /, ""),
        });

        const flavor = await this.messageFlavor(sourceActor, targetActor, subtitle);

        await ChatMessage.create({
            user: requester.id,
            speaker: { alias: speaker },
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
            flavor,
            content,
        });
    }

    private async messageFlavor(sourceActor: ActorPF2e, targetActor: ActorPF2e, subtitle: string): Promise<string> {
        return await renderTemplate(this.templatePaths.flavor, {
            action: {
                title: "PF2E.TraitInteract",
                subtitle: subtitle,
                tooltip: "PF2E.TraitInteract",
                typeNumber: sourceActor.isOfType("loot") && targetActor.isOfType("loot") ? 2 : 1,
            },
            traits: [
                {
                    name: CONFIG.PF2E.featTraits.manipulate,
                    description: CONFIG.PF2E.traitsDescriptions.manipulate,
                },
            ],
        });
    }
}
