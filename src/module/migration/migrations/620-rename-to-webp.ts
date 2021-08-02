import { ActorSourcePF2e } from "@actor/data";
import { ABCFeatureEntryData } from "@item/abc/data";
import { AncestrySource, BackgroundSource, ClassSource, ItemSourcePF2e, KitSource } from "@item/data";
import { KitEntryData } from "@item/kit/data";
import { MigrationBase } from "../base";

export class Migration620RenameToWebp extends MigrationBase {
    static override version = 0.62;

    private regexp = /(\/?systems\/pf2e\/[^"]+)\.(?:jpg|png)\b/;

    private renameToWebP<T extends string>(imgPath: T): T;
    private renameToWebP(imgPath: undefined): undefined;
    private renameToWebP<T extends string>(imgPath: T | undefined): T | undefined;
    private renameToWebP<T extends string>(imgPath: T | undefined): T | undefined {
        if (typeof imgPath === "string" && this.regexp.test(imgPath)) {
            return imgPath.replace(this.regexp, "$1.webp") as T;
        }
        return imgPath?.replace("icons/svg/mystery-man.svg", "systems/pf2e/icons/default-icons/mystery-man.svg") as T;
    }

    private isABCK(itemData: ItemSourcePF2e): itemData is AncestrySource | BackgroundSource | ClassSource | KitSource {
        const ITEMS_WITH_ITEMS = ["ancestry", "background", "class", "kit"];
        return ITEMS_WITH_ITEMS.includes(itemData.type);
    }

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        actorData.img = this.renameToWebP(actorData.img);

        if (typeof actorData.token?.img === "string") {
            actorData.token.img = this.renameToWebP(actorData.token.img);
        }

        // Icons for active effects
        for (const effect of actorData.effects ?? []) {
            effect.icon = this.renameToWebP(effect.icon);
        }

        if (actorData.type === "character") {
            actorData.data.details.deity.image = this.renameToWebP(actorData.data.details.deity.image);
        }
    }

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        itemData.img = this.renameToWebP(itemData.img);

        // Icons for active effects
        for (const effect of itemData.effects ?? []) {
            effect.icon = this.renameToWebP(effect.icon);
        }

        if (itemData.type === "consumable" && itemData.data.spell?.data) {
            const embeddedSpell = itemData.data.spell.data;
            embeddedSpell.img = this.renameToWebP(embeddedSpell.img);
        }

        if (itemData.type === "condition" && itemData.flags.pf2e?.condition) {
            itemData.data.hud.img.value = this.renameToWebP(itemData.data.hud.img.value);
        }

        if (this.isABCK(itemData)) {
            const embedData = itemData.data.items;
            const embeds = Object.values(embedData).filter(
                (maybeEmbed): maybeEmbed is KitEntryData | ABCFeatureEntryData => !!maybeEmbed
            );
            for (const embed of embeds) {
                embed.img = this.renameToWebP(embed.img);
                if ("items" in embed && embed.items) {
                    const deepEmbeds = Object.values(embed.items).filter((maybeDeepEmbed) => !!maybeDeepEmbed);
                    for (const deepEmbed of deepEmbeds) {
                        deepEmbed.img = this.renameToWebP(deepEmbed.img);
                    }
                }
            }
        }
    }

    override async updateMacro(macroData: foundry.data.MacroSource): Promise<void> {
        macroData.img = this.renameToWebP(macroData.img);
    }

    override async updateTable(tableData: foundry.data.RollTableSource): Promise<void> {
        tableData.img = this.renameToWebP(tableData.img);
        for (const result of tableData.results) {
            result.img = this.renameToWebP(result.img);
        }
    }

    override async updateToken(tokenData: foundry.data.TokenSource): Promise<void> {
        tokenData.img = this.renameToWebP(tokenData.img);
        tokenData.effects = tokenData.effects.filter((texture) => !this.regexp.test(texture));
    }

    override async updateUser(userData: foundry.data.UserSource): Promise<void> {
        userData.img = this.renameToWebP(userData.img);
    }
}
