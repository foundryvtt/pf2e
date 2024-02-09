import { ActorPF2e } from "@actor";
import { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import { createHTMLElement, setHasElement } from "@util";
import * as R from "remeda";
import { ItemSourcePF2e, ItemType, RawItemChatData } from "./base/data/index.ts";
import { ItemPF2e } from "./base/document.ts";
import { PhysicalItemPF2e } from "./physical/document.ts";
import { PHYSICAL_ITEM_TYPES } from "./physical/values.ts";
import { ItemInstances } from "./types.ts";

type ItemOrSource = PreCreate<ItemSourcePF2e> | ItemPF2e;

/** Determine in a type-safe way whether an `ItemPF2e` or `ItemSourcePF2e` is among certain types */
function itemIsOfType<TParent extends ActorPF2e | null, TType extends ItemType>(
    item: ItemOrSource,
    ...types: TType[]
): item is ItemInstances<TParent>[TType] | ItemInstances<TParent>[TType]["_source"];
function itemIsOfType<TParent extends ActorPF2e | null, TType extends "physical" | ItemType>(
    item: ItemOrSource,
    ...types: TType[]
): item is TType extends "physical"
    ? PhysicalItemPF2e<TParent> | PhysicalItemPF2e<TParent>["_source"]
    : TType extends ItemType
      ? ItemInstances<TParent>[TType] | ItemInstances<TParent>[TType]["_source"]
      : never;
function itemIsOfType<TParent extends ActorPF2e | null>(
    item: ItemOrSource,
    type: "physical",
): item is PhysicalItemPF2e<TParent> | PhysicalItemPF2e["_source"];
function itemIsOfType(item: ItemOrSource, ...types: string[]): boolean {
    return (
        typeof item.name === "string" &&
        types.some((t) => (t === "physical" ? setHasElement(PHYSICAL_ITEM_TYPES, item.type) : item.type === t))
    );
}

/** Create a "reduced" item name; that is, one without an "Effect:" or similar prefix */
function reduceItemName(label: string): string {
    return label.includes(":") ? label.replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "") : label;
}

/** A helper class to finalize data for item summaries and chat cards */
class ItemChatData {
    item: ItemPF2e;
    data: RawItemChatData;
    htmlOptions: EnrichmentOptionsPF2e;

    constructor({ item, data, htmlOptions = {} }: ItemChatDataConstructorOptions) {
        this.item = item;
        this.data = data;
        this.htmlOptions = htmlOptions;
    }

    async process(): Promise<RawItemChatData> {
        const description = { ...this.data.description, value: await this.#prepareDescription() };
        return fu.mergeObject(this.data, { description }, { inplace: false });
    }

    async #prepareDescription(): Promise<string> {
        const { data, item } = this;
        const rollOptions = new Set(R.compact([item.actor?.getRollOptions(), item.getRollOptions("item")].flat()));

        const baseText = await (async (): Promise<string> => {
            const override = data.description?.override;
            if (!override) return data.description.value;
            return override
                .flatMap((line) => {
                    if (!line.predicate.test(rollOptions)) return [];
                    const hr = line.divider ? document.createElement("hr") : null;
                    const title = line.title
                        ? createHTMLElement("strong", { children: [game.i18n.localize(line.title)] })
                        : null;
                    const whitespace = title ? " " : null;
                    const text = game.i18n.localize(line.text);
                    const paragraph = createHTMLElement("p", { children: R.compact([title, whitespace, text]) });
                    return R.compact([hr, paragraph].map((e) => e?.outerHTML));
                })
                .join("\n");
        })();

        const addenda = await (async (): Promise<string[]> => {
            if (item.system.description.addenda.length === 0) return [];

            const templatePath = "systems/pf2e/templates/items/partials/addendum.hbs";
            return Promise.all(
                data.description.addenda.flatMap((unfiltered) => {
                    const addendum = {
                        label: game.i18n.localize(unfiltered.label),
                        contents: unfiltered.contents
                            .filter((c) => c.predicate.test(rollOptions))
                            .map((line) => {
                                line.title &&= game.i18n.localize(line.title);
                                line.text = game.i18n.localize(line.text);
                                return line;
                            }),
                    };
                    return addendum.contents.length > 0 ? renderTemplate(templatePath, { addendum }) : [];
                }),
            );
        })();

        const assembled = R.compact([baseText, addenda.length > 0 ? "\n<hr />\n" : null, ...addenda]).join("\n");
        const rollData = fu.mergeObject(this.item.getRollData(), this.htmlOptions.rollData);

        return TextEditor.enrichHTML(assembled, { ...this.htmlOptions, rollData, async: true });
    }
}

interface ItemChatDataConstructorOptions {
    item: ItemPF2e;
    data: RawItemChatData;
    htmlOptions?: EnrichmentOptionsPF2e;
}

export { ItemChatData, itemIsOfType, reduceItemName };
