import { CharacterPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import type { ItemType } from "@item/base/data/index.ts";
import { SvelteApplicationMixin } from "@module/apps/svelte-mixin.svelte.ts";
import { sluggify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import type {
    DocumentSheetConfiguration,
    DocumentSheetV2,
} from "types/foundry/client-esm/applications/api/module.d.ts";
import Root from "./root.svelte";

type AhBCDType = Extract<ItemType, "ancestry" | "heritage" | "background" | "class" | "deity">;

interface ABCPickerConfiguration extends DocumentSheetConfiguration<CharacterPF2e> {
    itemType: AhBCDType;
}

interface ABCPickerItemRef {
    name: string;
    img: ImageFilePath;
    uuid: ItemUUID;
    source: {
        name: string;
        /** Whether the source comes from an item's publication data or is simply the providing module */
        publication: boolean;
    };
}

interface ABCPickerContext {
    itemType: AhBCDType;
    items: ABCPickerItemRef[];
}

/** A `Compendium`-like application for presenting A(H)BCD options for a character */
class ABCPicker extends SvelteApplicationMixin<AbstractConstructorOf<DocumentSheetV2> & { DEFAULT_OPTIONS: object }>(
    foundry.applications.api.DocumentSheetV2,
) {
    static override DEFAULT_OPTIONS: DeepPartial<ABCPickerConfiguration> = {
        id: "{id}",
        classes: ["abc-picker"],
        position: { width: 350, height: Math.floor(0.85 * window.innerHeight) },
        window: { icon: "fa-solid fa-atlas", contentClasses: ["standard-form"] },
        sheetConfig: false,
    };

    declare options: ABCPickerConfiguration;

    root = Root;

    /** The items to present */
    items: ABCPickerItemRef[] = [];

    override get title(): string {
        const itemType = this.options.itemType.capitalize();
        return game.i18n.localize(`PF2E.Item.${itemType}.Plural`);
    }

    protected override _initializeApplicationOptions(options: Partial<ABCPickerConfiguration>): ABCPickerConfiguration {
        const initialized = super._initializeApplicationOptions(options) as ABCPickerConfiguration;
        initialized.window.icon = `fa-solid ${CONFIG.Item.typeIcons[initialized.itemType]}`;
        initialized.uniqueId = `abc-picker-${initialized.itemType}-${initialized.document.uuid}`;
        return initialized;
    }

    async #gatherItems(): Promise<ABCPickerItemRef[]> {
        const itemType = this.options.itemType;
        const worldItems = game.items.filter((i) => i.type === itemType && i.testUserPermission(game.user, "LIMITED"));
        const packItems = await UUIDUtils.fromUUIDs(
            game.packs
                .filter((p) => p.documentName === "Item" && p.testUserPermission(game.user, "LIMITED"))
                .flatMap((p) => p.index.filter((e) => e.type === itemType).map((e) => e.uuid as CompendiumItemUUID)),
        );

        const actor = this.document;
        const items = R.unique(
            [worldItems, packItems]
                .flat()
                .filter((item): item is ItemPF2e<null> => {
                    if (item.type !== itemType || item.parent) return false;
                    if (item.isOfType("heritage")) {
                        const ancestrySlug = actor.ancestry
                            ? (actor.ancestry.slug ?? sluggify(actor.ancestry.name))
                            : null;
                        return item.system.ancestry?.slug === ancestrySlug || item.system.ancestry === null;
                    }
                    return true;
                })
                .sort((a, b) => a.name.localeCompare(b.name)),
        );

        /** Resolve a "source", preferring publication title if set and resorting to fallbacks. */
        const resolveSource = (item: ItemPF2e): { name: string; publication: boolean } => {
            const publication = item.system.publication.title.trim();
            if (publication) return { name: publication, publication: true };
            if (item.uuid.startsWith("Item.")) return { name: game.world.title, publication: false };
            const compendiumPack = game.packs.get(item.pack ?? "");
            const module = game.modules.get(compendiumPack?.metadata.packageName ?? "");
            const name = module?.title ?? compendiumPack?.title ?? "???";
            return { name, publication: false };
        };

        return items.map(
            (i): ABCPickerItemRef => ({
                ...R.pick(i, ["name", "img", "uuid"]),
                source: resolveSource(i),
            }),
        );
    }

    protected override async _prepareContext(): Promise<ABCPickerContext> {
        return {
            itemType: this.options.itemType,
            items: await this.#gatherItems(),
        };
    }
}

export { ABCPicker, type ABCPickerContext };
