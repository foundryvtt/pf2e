import { ActorDataPF2e } from '@actor/data-definitions';
import { AncestryData, BackgroundData, ClassData, ItemDataPF2e, KitData } from '@item/data-definitions';
import { MigrationBase } from './base';

export class Migration620RenameToWebp extends MigrationBase {
    static version = 0.62;

    private regexp = /(\/?systems\/pf2e\/[^"]+)\.(?:jpg|png)\b/;

    private renameToWebP(imgPath: string): string;
    private renameToWebP(imgPath: undefined): undefined;
    private renameToWebP(imgPath: string | undefined): string | undefined;
    private renameToWebP(imgPath: string | undefined): string | undefined {
        if (typeof imgPath === 'string' && this.regexp.test(imgPath)) {
            return imgPath.replace(this.regexp, '$1.webp');
        }
        return imgPath?.replace('icons/svg/mystery-man.svg', 'systems/pf2e/icons/default-icons/mystery-man.svg');
    }

    private isABCK(itemData: ItemDataPF2e): itemData is AncestryData | BackgroundData | ClassData | KitData {
        const ITEMS_WITH_ITEMS = ['ancestry', 'background', 'class', 'kit'];
        return ITEMS_WITH_ITEMS.includes(itemData.type);
    }

    async updateActor(actorData: ActorDataPF2e): Promise<void> {
        actorData.img = this.renameToWebP(actorData.img);

        if (typeof actorData.token?.img === 'string') {
            actorData.token.img = this.renameToWebP(actorData.token.img);
        }

        // Icons for active effects
        for (const effect of actorData.effects ?? []) {
            effect.icon = this.renameToWebP(effect.icon);
        }

        if (actorData.type === 'character' || actorData.type === 'npc') {
            actorData.data.details.deity.image = this.renameToWebP(actorData.data.details.deity.image);
        }
    }

    async updateItem(itemData: ItemDataPF2e): Promise<void> {
        itemData.img = this.renameToWebP(itemData.img);

        // Icons for active effects
        for (const effect of itemData.effects ?? []) {
            effect.icon = this.renameToWebP(effect.icon);
        }

        if (itemData.type === 'consumable' && itemData.data.spell?.data) {
            const embeddedSpell = itemData.data.spell.data;
            embeddedSpell.img = this.renameToWebP(embeddedSpell.img);
        }

        if (itemData.type === 'condition' && itemData.flags.pf2e?.condition) {
            itemData.data.hud.img.value = this.renameToWebP(itemData.data.hud.img.value);
        }

        if (this.isABCK(itemData)) {
            type EmbeddedItemData = {
                img: string;
                items?: Record<string, EmbeddedItemData>;
            };
            const embedData: Record<string, EmbeddedItemData> = itemData.data.items;
            for (const embed of Object.values(embedData)) {
                embed.img = this.renameToWebP(embed.img);
                if ('items' in embed && embed.items) {
                    const deepEmbeds = Object.values(embed.items);
                    for (const deepEmbed of deepEmbeds) {
                        deepEmbed.img = this.renameToWebP(deepEmbed.img);
                    }
                }
            }
        }
    }

    async updateMacro(macroData: MacroData): Promise<void> {
        macroData.img = this.renameToWebP(macroData.img);
    }

    async updateMessage(messageData: ChatMessageData): Promise<void> {
        messageData.flavor = this.renameToWebP(messageData.flavor);
        messageData.content = this.renameToWebP(messageData.content);
    }

    async updateTable(tableData: RollTableData): Promise<void> {
        tableData.img = this.renameToWebP(tableData.img);
        for (const result of tableData.results) {
            result.img = this.renameToWebP(result.img);
        }
    }

    async updateToken(tokenData: TokenData): Promise<void> {
        tokenData.img = this.renameToWebP(tokenData.img);
        tokenData.effects = tokenData.effects.map((effect) => this.renameToWebP(effect));
    }

    async updateUser(userData: UserData): Promise<void> {
        userData.img = this.renameToWebP(userData.img);
    }
}
