import { ActorDataPF2e } from '@actor/data-definitions';
import { ItemDataPF2e } from '@item/data-definitions';
import { MigrationBase } from './base';

export class Migration620RenameToWebp extends MigrationBase {
    static version = 0.62;

    private regexp = /(\/?systems\/pf2e\/[^"\s]+)\.(?:jpg|png)\b/;

    private renameToWebP(imgPath: string): string;
    private renameToWebP(imgPath: undefined): undefined;
    private renameToWebP(imgPath: string | undefined): string | undefined;
    private renameToWebP(imgPath: string | undefined): string | undefined {
        if (typeof imgPath === 'string' && this.regexp.test(imgPath)) {
            return imgPath.replace(this.regexp, '$1.webp');
        }
        return imgPath;
    }

    async updateActor(actorData: ActorDataPF2e): Promise<void> {
        actorData.img = this.renameToWebP(actorData.img);
        if (typeof actorData.token?.img === 'string') {
            actorData.token.img = this.renameToWebP(actorData.token.img);
        }
        if (actorData.type === 'character' || actorData.type === 'npc') {
            actorData.data.details.deity.image = this.renameToWebP(actorData.data.details.deity.image);
        }
    }

    async updateItem(itemData: ItemDataPF2e): Promise<void> {
        itemData.img = this.renameToWebP(itemData.img);
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
    }

    async updateUser(userData: UserData): Promise<void> {
        userData.img = this.renameToWebP(userData.img);
    }
}
