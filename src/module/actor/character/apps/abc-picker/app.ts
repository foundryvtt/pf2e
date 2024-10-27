import { CharacterPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import type { ItemType } from "@item/base/data/index.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@system/svelte/mixin.svelte.ts";
import { sluggify } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import type { ApplicationConfiguration } from "types/foundry/client-esm/applications/_types.d.ts";
import type { ApplicationV2 } from "types/foundry/client-esm/applications/api/module.d.ts";
import Root from "./app.svelte";

type AhBCDType = Extract<ItemType, "ancestry" | "heritage" | "background" | "class" | "deity">;

interface ABCPickerConfiguration extends ApplicationConfiguration {
    actor: CharacterPF2e;
    itemType: AhBCDType;
}

interface ABCItemRef {
    name: string;
    img: ImageFilePath;
    uuid: ItemUUID;
    source: {
        name: string;
        /** Whether the source comes from an item's publication data or is simply the providing module */
        publication: boolean;
    };
    hidden: boolean;
}

interface ABCPickerContext extends SvelteApplicationRenderContext {
    actor: CharacterPF2e;
    foundryApp: ABCPicker;
    state: { prompt: string; itemType: AhBCDType; items: ABCItemRef[] };
}

/** A `Compendium`-like application for presenting A(H)BCD options for a character */
class ABCPicker extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<ABCPickerConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ABCPickerConfiguration> = {
        id: "{id}",
        classes: ["abc-picker"],
        position: { width: 350, height: 650 },
        window: { icon: "fa-solid fa-atlas", contentClasses: ["standard-form", "compact"] },
    };

    declare options: ABCPickerConfiguration;

    protected root = Root;

    override get title(): string {
        const type = game.i18n.localize(`TYPES.Item.${this.options.itemType}`);
        return game.i18n.format("PF2E.Actor.Character.ABCPicker.Title", { type });
    }

    protected override _initializeApplicationOptions(options: Partial<ABCPickerConfiguration>): ABCPickerConfiguration {
        const initialized = super._initializeApplicationOptions(options) as ABCPickerConfiguration;
        initialized.window.icon = `fa-solid ${CONFIG.Item.typeIcons[initialized.itemType]}`;
        initialized.uniqueId = `abc-picker-${initialized.itemType}-${initialized.actor.uuid}`;
        return initialized;
    }

    /** Gather all items of the request type from the world and across all item compendiums. */
    async #gatherItems(): Promise<ABCItemRef[]> {
        const { actor, itemType } = this.options;
        const worldItems = game.items.filter((i) => i.type === itemType && i.testUserPermission(game.user, "LIMITED"));
        const packItems = await UUIDUtils.fromUUIDs(
            game.packs
                .filter((p) => p.documentName === "Item" && p.testUserPermission(game.user, "LIMITED"))
                .flatMap((p) => p.index.filter((e) => e.type === itemType).map((e) => e.uuid as CompendiumItemUUID)),
        );

        const items = [...worldItems, ...packItems]
            .filter((item): item is ItemPF2e<null> => {
                if (item.type !== itemType || item.parent) return false;
                if (item.pack?.startsWith("pf2e-animal-companions.")) return false;
                if (item.isOfType("heritage")) {
                    const ancestrySlug = actor.ancestry ? (actor.ancestry.slug ?? sluggify(actor.ancestry.name)) : null;
                    return item.system.ancestry?.slug === ancestrySlug || item.system.ancestry === null;
                }
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

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
            (i): ABCItemRef => ({
                ...R.pick(i, ["name", "img", "uuid"]),
                source: resolveSource(i),
                hidden: false,
            }),
        );
    }

    protected override async _prepareContext(): Promise<ABCPickerContext> {
        const itemType = this.options.itemType;
        return {
            actor: this.options.actor,
            foundryApp: this,
            state: {
                prompt: game.i18n.localize(`PF2E.Actor.Character.ABCPicker.Prompt.${itemType}`),
                itemType,
                items: await this.#gatherItems(),
            },
        };
    }
}

export { ABCPicker, type ABCPickerContext };
