import { PF2EActor, UserPF2e } from './actor';
import { LootData } from './actorDataDefinitions';
import { PF2EPhysicalItem } from '../item/physical';
import { PF2EItem } from '../item/item';
import { attemptToRemoveCoinsByValue, extractPriceFromItem } from '../item/treasure';
import { PF2ECharacter } from './character';

export class PF2ELoot extends PF2EActor {
    /** @override */
    data!: LootData;

    get isLoot(): boolean {
        return this.data.data.lootSheetType === 'Loot';
    }

    get isMerchant(): boolean {
        return this.data.data.lootSheetType === 'Merchant';
    }

    /** Anyone with Observer permission can update a loot actor
     * @override
     */
    static can(user: User, action: string, target: PF2ELoot): boolean {
        if (action === 'update') {
            return target.hasPerm(user, 'OBSERVER');
        }
        return super.can(user, action, target);
    }

    isLootableBy(user: User) {
        return PF2ELoot.can(user, 'update', this);
    }

    /** @override */
    async transferItemToActor(
        targetActor: PF2EActor,
        item: PF2EItem,
        quantity: number,
        containerId?: string,
    ): Promise<PF2EPhysicalItem | void> {
        // If we don't have permissions send directly to super to prevent removing the coins twice or reject as needed
        if (!(this.owner && targetActor.owner)) {
            return super.transferItemToActor(targetActor, item, quantity, containerId);
        }
        if (this.data.data.lootSheetType === 'Merchant' && !this.getFlag('pf2e', 'editLoot.value')) {
            let itemValue = extractPriceFromItem(item.data, quantity);
            if (await attemptToRemoveCoinsByValue({ actor: targetActor, coinsToRemove: itemValue })) {
                return super.transferItemToActor(targetActor, item, quantity, containerId);
            } else {
                ui.notifications.warn(game.i18n.format(CONFIG.PF2E.loot.errors.insufficient), {
                    buyer: targetActor.name,
                });
                return Promise.reject();
            }
        }

        return super.transferItemToActor(targetActor, item, quantity, containerId);
    }
}

export interface LootTransferData {
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
    containerId: string;
}

export class LootTransfer implements LootTransferData {
    private templatePaths = {
        flavor: '/systems/pf2e/templates/chat/interact/flavor.html',
        content: '/systems/pf2e/templates/chat/interact/content.html',
    };

    constructor(
        public source: LootTransferData['source'],
        public target: LootTransferData['target'],
        public quantity: number,
        public containerId: string,
    ) {}

    async request(): Promise<void> {
        const gamemaster = game.users.find((user) => user.isGM && user.active);
        if (gamemaster === null) {
            const source = this.getSource();
            const target = this.getTarget();
            const loot = [source, target].find(
                (actor) => actor instanceof PF2ELoot && actor.isLootableBy(game.user) && !actor.owner,
            );

            if (!(loot instanceof PF2ELoot)) return Promise.reject(new Error('PF2e System | Unexpected missing actor'));
            ui.notifications.error(
                game.i18n.format(CONFIG.PF2E.loot.errors.supervision, { loot: LootTransfer.tokenName(loot) }),
            );
            return Promise.reject();
        }
        console.debug(`PF2e System | Requesting loot transfer from GM ${gamemaster.name}`);

        game.socket.emit('system.pf2e', { request: 'lootTransfer', data: this });
    }

    // Only a GM can call this method, or else Foundry will block it (or would if we didn't first)
    async enact(requester: UserPF2e): Promise<void> {
        if (!game.user.isGM) {
            return Promise.reject(new Error('Unauthorized loot transfer'));
        }

        console.debug('PF2e System | Enacting loot transfer');
        const sourceActor = this.getSource();
        const sourceItem = sourceActor?.items?.find((item) => item.id === this.source.itemId);
        const targetActor = this.getTarget();

        // Sanity checks
        if (
            !(
                sourceActor instanceof PF2EActor &&
                sourceItem instanceof PF2EPhysicalItem &&
                targetActor instanceof PF2EActor &&
                (sourceActor.hasPerm(requester, 'owner') || sourceActor instanceof PF2ELoot) &&
                (targetActor.hasPerm(requester, 'owner') || targetActor instanceof PF2ELoot)
            )
        ) {
            return Promise.reject(new Error('PF2e System | Failed sanity check during loot transfer'));
        }

        const targetItem = await sourceActor.transferItemToActor(
            targetActor,
            sourceItem,
            this.quantity,
            this.containerId,
        );
        if (!(targetItem instanceof PF2EPhysicalItem)) {
            return Promise.reject();
        }

        this.sendMessage(requester, sourceActor, targetActor, targetItem);
    }

    /** Retrieve the full actor from the source or target ID */
    private getActor(tokenId: string | undefined, actorId: string): PF2EActor | null {
        if (typeof tokenId === 'string') {
            const token = canvas.tokens.placeables.find((canvasToken) => canvasToken.id === tokenId);
            return token?.actor ?? null;
        }
        return game.actors.find((actor) => actor.id === actorId);
    }

    private getSource(): PF2EActor | null {
        return this.getActor(this.source.tokenId, this.source.actorId);
    }

    private getTarget(): PF2EActor | null {
        return this.getActor(this.target.tokenId, this.target.actorId);
    }

    // Prefer token names over actor names
    private static tokenName(entity: PF2EActor | User): string {
        if (entity instanceof PF2EActor) {
            // Synthetic actor: use its token name or, failing that, actor name
            if (entity.isToken && entity.token instanceof Token) {
                return entity.token.name;
            }
            // Linked actor: use its token prototype name
            return entity.data.token?.name ?? entity.name;
        }
        // User with an assigned character
        if (entity.character instanceof PF2ECharacter) {
            const token = canvas.tokens.placeables.find((canvasToken) => canvasToken.actor?.id === entity.id);
            return token?.name ?? entity.character?.name;
        }

        // User with no assigned character (should never happen)
        return entity.name;
    }

    /** Send a chat message that varies on the types of transaction and parties involved
     * @param requester   The player who requested an item transfer to be performed by the GM
     * @param sourceActor The actor from which the item was dragged
     * @param targetActor The actor on which the item was dropped
     * @param item        The item created on the target actor as a result of the drag & drop
     */
    private async sendMessage(
        requester: UserPF2e,
        sourceActor: PF2EActor,
        targetActor: PF2EActor,
        item: PF2EPhysicalItem,
    ): Promise<void> {
        // Exhaustive pattern match to determine speaker and item-transfer parties
        type PatternMatch = [speaker: string, subtitle: string, formatArgs: Parameters<Game['i18n']['format']>];

        const [speaker, subtitle, formatArgs] = ((): PatternMatch => {
            const isWhat = (actor: PF2EActor) => ({
                isCharacter: actor instanceof PF2ECharacter,
                isLoot: actor instanceof PF2ELoot && actor.isLoot,
                isMerchant: actor instanceof PF2ELoot && actor.isMerchant,
            });
            const source = isWhat(sourceActor);
            const target = isWhat(targetActor);

            if (source.isCharacter && target.isLoot) {
                // Character deposits item in loot container
                return [
                    LootTransfer.tokenName(sourceActor),
                    CONFIG.PF2E.loot.subtitles.deposit,
                    [
                        CONFIG.PF2E.loot.messages.deposit,
                        {
                            depositor: LootTransfer.tokenName(sourceActor),
                            container: LootTransfer.tokenName(targetActor),
                        },
                    ],
                ];
            } else if (source.isCharacter && target.isMerchant) {
                // Character gives item to merchant
                return [
                    LootTransfer.tokenName(sourceActor),
                    CONFIG.PF2E.loot.subtitles.give,
                    [
                        CONFIG.PF2E.loot.messages.give,
                        { giver: LootTransfer.tokenName(sourceActor), recipient: LootTransfer.tokenName(targetActor) },
                    ],
                ];
            } else if (source.isLoot && target.isCharacter) {
                // Character takes item from loot container
                return [
                    LootTransfer.tokenName(targetActor),
                    CONFIG.PF2E.loot.subtitles.take,
                    [
                        CONFIG.PF2E.loot.messages.take,
                        { taker: LootTransfer.tokenName(targetActor), container: LootTransfer.tokenName(sourceActor) },
                    ],
                ];
            } else if (source.isLoot && target.isLoot) {
                return [
                    // Character transfers item between two loot containers
                    requester.character?.name ?? requester.name,
                    CONFIG.PF2E.loot.subtitles.transfer,
                    [
                        CONFIG.PF2E.loot.messages.transfer,
                        {
                            transferrer: requester.character?.name ?? requester.name,
                            fromContainer: LootTransfer.tokenName(sourceActor),
                            toContainer: LootTransfer.tokenName(targetActor),
                        },
                    ],
                ];
            } else if (source.isLoot && target.isMerchant) {
                // Character gives item to merchant directly from loot container
                return [
                    requester.character?.name ?? requester.name,
                    CONFIG.PF2E.loot.subtitles.give,
                    [
                        CONFIG.PF2E.loot.messages.give,
                        {
                            seller: requester.character?.name ?? requester.name,
                            buyer: LootTransfer.tokenName(targetActor),
                        },
                    ],
                ];
            } else if (source.isMerchant && target.isCharacter) {
                // Merchant sells item to character
                return [
                    LootTransfer.tokenName(sourceActor),
                    CONFIG.PF2E.loot.subtitles.sell,
                    [
                        CONFIG.PF2E.loot.messages.sell,
                        { seller: LootTransfer.tokenName(sourceActor), buyer: LootTransfer.tokenName(targetActor) },
                    ],
                ];
            } else if (source.isMerchant && target.isLoot) {
                // Merchant sells item to character, who stows it directly in loot container
                return [
                    requester.character?.name ?? requester.name,
                    CONFIG.PF2E.loot.messages.sell,
                    [
                        CONFIG.PF2E.loot.messages.sell,
                        {
                            seller: LootTransfer.tokenName(sourceActor),
                            buyer: requester.character?.name ?? requester.name,
                        },
                    ],
                ];
            } else {
                // Possibly to fill out later: Merchant sells item to character directly from loot container
                throw Error('Unexpected item transfer');
            }
        })();
        formatArgs[1].quantity = item.quantity;
        formatArgs[1].item = item.name;

        const flavor = await renderTemplate(this.templatePaths.flavor, {
            action: {
                title: CONFIG.PF2E.featTraits.interact,
                subtitle: subtitle,
                tooltip: CONFIG.PF2E.featTraits.interact,
                typeNumber: sourceActor instanceof PF2ELoot && targetActor instanceof PF2ELoot ? 2 : 1,
            },
            traits: [
                {
                    name: CONFIG.PF2E.featTraits.manipulate,
                    description: CONFIG.PF2E.traitsDescriptions.manipulate,
                },
            ],
        });
        // Don't bother showing quantity if it's only 1:
        const content = await renderTemplate(this.templatePaths.content, {
            imgPath: item.img,
            message: game.i18n.format(...formatArgs).replace(/\b1 × /, ''),
        });

        ChatMessage.create({
            user: requester.id,
            speaker: { alias: speaker },
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
            img: item.img,
            flavor: flavor,
            content: content,
        });
    }
}
