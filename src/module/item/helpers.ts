import type { ActorPF2e } from "@actor";
import type { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import { createHTMLElement, setHasElement } from "@util";
import * as R from "remeda";
import { processSanctification } from "./ability/helpers.ts";
import type { ItemSourcePF2e, ItemType, RawItemChatData } from "./base/data/index.ts";
import { ItemDescriptionData } from "./base/data/system.ts";
import type { ItemPF2e } from "./base/document.ts";
import type { PhysicalItemPF2e } from "./physical/document.ts";
import { PHYSICAL_ITEM_TYPES } from "./physical/values.ts";
import type { ItemInstances } from "./types.ts";

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

/**
 * Performs late prep tasks on an item that doesn't exist in the actor, such as a cloned one.
 * If the item isn't embedded, nothing happens.
 */
function performLatePreparation(item: ItemPF2e): void {
    const actor = item.actor;
    if (!actor) return;

    for (const alteration of actor.synthetics.itemAlterations.filter((a) => !a.isLazy)) {
        alteration.applyAlteration({ singleItem: item as ItemPF2e<ActorPF2e> });
    }

    if (item.isOfType("spell", "feat", "action")) {
        processSanctification(item);
    }
}

/** A helper class to finalize data for item summaries and chat cards */
class ItemChatData {
    item: ItemPF2e;
    data: RawItemChatData;
    htmlOptions: EnrichmentOptionsPF2e;

    /** A showdown markdown converter */
    static #mdConverter: showdown.Converter | null = null;

    constructor({ item, data, htmlOptions = {} }: ItemChatDataConstructorOptions) {
        this.item = item;
        this.data = data;
        this.htmlOptions = htmlOptions;
    }

    /** Sanitized and convert stringy markdown into stringy HTML, with any initial HTML content stripped */
    static markdownToHTML(markdown: string): string {
        const converter = (ItemChatData.#mdConverter ??= new showdown.Converter());
        const htmlStripped = createHTMLElement("div", { innerHTML: game.i18n.localize(markdown).trim() }).innerText;
        // Prevent markdown converter from treating Foundry content links as markdown links
        const withSubbedBrackets = htmlStripped.replaceAll("[", "⟦").replaceAll("]", "⟧");
        const stringyHTML = converter
            .makeHtml(withSubbedBrackets)
            .replace(/<\/?p[^>]*>/g, "")
            .replaceAll("⟦", "[")
            .replaceAll("⟧", "]");

        return TextEditor.truncateHTML(createHTMLElement("div", { innerHTML: stringyHTML })).innerHTML.trim();
    }

    async process(): Promise<RawItemChatData> {
        const description = {
            ...this.data.description,
            ...(await this.#prepareDescription()),
        };
        return fu.mergeObject(this.data, { description }, { inplace: false });
    }

    async #prepareDescription(): Promise<Pick<ItemDescriptionData, "value" | "gm">> {
        const item = this.item;
        const actor = item.actor;
        const rollOptions = new Set([actor?.getRollOptions(), item.getRollOptions("item")].flat().filter(R.isTruthy));
        const description = await this.item.getDescription();

        const baseText = await (async (): Promise<string> => {
            const override = description?.override;
            if (!override) return description.value;
            return override
                .flatMap((line) => {
                    if (!line.predicate.test(rollOptions)) return [];
                    const hr = line.divider ? document.createElement("hr") : null;

                    // Create paragraph element
                    const paragraph = createHTMLElement("p");
                    if (line.title) {
                        paragraph.appendChild(
                            createHTMLElement("strong", { children: [game.i18n.localize(line.title)] }),
                        );
                        paragraph.appendChild(new Text(" "));
                    }
                    const text = ItemChatData.markdownToHTML(line.text);
                    if (text) {
                        paragraph.insertAdjacentHTML("beforeend", text);
                    }

                    return [hr, paragraph].map((e) => e?.outerHTML).filter(R.isTruthy);
                })
                .join("\n");
        })();

        const addenda = await (async (): Promise<string[]> => {
            if (item.system.description.addenda.length === 0) return [];

            const templatePath = "systems/pf2e/templates/items/partials/addendum.hbs";
            return Promise.all(
                description.addenda.flatMap((unfiltered) => {
                    const addendum = {
                        label: game.i18n.localize(unfiltered.label),
                        contents: unfiltered.contents
                            .filter((c) => c.predicate.test(rollOptions))
                            .map((line) => {
                                line.title &&= game.i18n.localize(line.title).trim();
                                line.text = ItemChatData.markdownToHTML(line.text);
                                return line;
                            }),
                    };
                    return addendum.contents.length > 0 ? renderTemplate(templatePath, { addendum }) : [];
                }),
            );
        })();

        const assembled = [baseText, addenda.length > 0 ? "\n<hr />\n" : null, ...addenda]
            .filter(R.isTruthy)
            .join("\n");
        const rollData = fu.mergeObject(this.item.getRollData(), this.htmlOptions.rollData);

        return {
            value: await TextEditor.enrichHTML(assembled, { ...this.htmlOptions, rollData }),
            gm: game.user.isGM ? await TextEditor.enrichHTML(description.gm, { ...this.htmlOptions, rollData }) : "",
        };
    }
}

interface ItemChatDataConstructorOptions {
    item: ItemPF2e;
    data: RawItemChatData;
    htmlOptions?: EnrichmentOptionsPF2e;
}

export { ItemChatData, itemIsOfType, performLatePreparation, reduceItemName };
