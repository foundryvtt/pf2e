import { LANGUAGES, LANGUAGE_RARITIES } from "@actor/creature/values.ts";
import {
    ErrorPF2e,
    SORTABLE_BASE_OPTIONS,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    localizer,
    objectHasKey,
    setHasElement,
    sluggify,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import Sortable from "sortablejs";
import { HomebrewTag, LanguageNotCommon, LanguageSettings, LanguageSettingsSheetData } from "./data.ts";
import { HomebrewElements } from "./menu.ts";

/** A helper class for managing languages and their rarities */
export class LanguagesManager {
    /** The parent settings menu */
    menu: HomebrewElements;

    /** A separate list of module-provided languages */
    moduleLanguages: LanguageNotCommon[];

    constructor(menu: HomebrewElements) {
        this.menu = menu;

        const languagesFromSetting = game.settings.get("pf2e", "homebrew.languages").map((l) => l.id);
        this.moduleLanguages = R.keys
            .strict(CONFIG.PF2E.languages)
            .filter(
                (l): l is LanguageNotCommon =>
                    l !== "common" && !LANGUAGES.includes(l) && !languagesFromSetting.includes(l),
            );

        this.data.reset();
    }

    get data(): LanguageSettings {
        return this.menu.cache.languageRarities;
    }

    getSheetData(): LanguageSettingsSheetData {
        const data = this.data.toObject(false);
        const homebrewLanguages = this.menu.cache.languages;
        return {
            commonLanguage: data.commonLanguage,
            ...R.mapToObj([...LANGUAGE_RARITIES, "unavailable"] as const, (r) => [
                r,
                data[r]
                    .map((slug) => {
                        const locKey =
                            CONFIG.PF2E.languages[slug] ?? homebrewLanguages.find((l) => l.id === slug)?.value ?? slug;
                        return { slug, label: game.i18n.localize(locKey) };
                    })
                    .sort((a, b) => a.label.localeCompare(b.label)),
            ]),
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    activateListeners(html: HTMLElement): void {
        const commonLanguageSelect = htmlQuery<HTMLSelectElement>(html, "select[data-common-language");
        commonLanguageSelect?.addEventListener("change", async (event) => {
            event.stopPropagation();
            const data = this.data;
            const newCommon = commonLanguageSelect.value || null;
            if (newCommon === null || setHasElement(data.common, newCommon)) {
                data.updateSource({ commonLanguage: newCommon });
            }
        });

        for (const list of htmlQueryAll(html, "ul[data-languages]")) {
            new Sortable(list, {
                ...SORTABLE_BASE_OPTIONS,
                group: "languages",
                sort: false,
                swapThreshold: 1,
                onEnd: (event) => this.#onDropLanguage(event),
            });
        }

        const rarities: readonly string[] = LANGUAGE_RARITIES;
        const localize = localizer("PF2E.SETTINGS.Homebrew.Languages.Rarities");
        for (const raritySection of htmlQueryAll(html, ".form-group.language-rarity")) {
            const rarity = Array.from(raritySection.classList).find((c) => rarities.includes(c)) ?? "unavailable";
            if (rarity === "unavailable") continue;
            const labelEl = raritySection.querySelector("label");
            if (!labelEl) throw ErrorPF2e("");

            labelEl.innerHTML = localize(sluggify(rarity, { camel: "bactrian" }));
            game.pf2e.TextEditor.convertXMLNode(labelEl, "rarity", { classes: ["tag", "rarity", rarity] });
        }
    }

    async #onDropLanguage(event: Sortable.SortableEvent): Promise<void> {
        const droppedEl = event.item;
        const dropTarget = htmlClosest(droppedEl, "ul[data-languages]");
        const oldRarity = droppedEl.dataset.rarity;
        const newRarity = dropTarget?.dataset.rarity;
        if (!(oldRarity && newRarity)) throw ErrorPF2e("Unexpected update to language rarities");
        if (oldRarity === newRarity) return;

        const language = droppedEl.dataset.slug;
        if (!objectHasKey(CONFIG.PF2E.languages, language) || language === "common") {
            throw ErrorPF2e("Unexpected update to language rarities");
        }

        const data = this.data;
        const source = data.toObject();
        const commonLanguageSelect = htmlQuery<HTMLSelectElement>(this.menu.form, "select[data-common-language]");
        if (!commonLanguageSelect) throw ErrorPF2e("Unexpected error updating menu");

        const rarities = ["uncommon", "rare", "secret", "unavailable"] as const;

        if (newRarity === "common") {
            for (const rarity of rarities) {
                source[rarity].findSplice((l) => l === language);
            }
            // Add `commonLanguageOption` without full re-render
            const newOption = document.createElement("option");
            newOption.value = language;
            newOption.textContent = droppedEl.textContent;
            commonLanguageSelect.append(newOption);
        } else {
            if (!tupleHasValue(rarities, newRarity)) {
                throw ErrorPF2e("Unexpected update to language rarities");
            }
            for (const rarity of rarities) {
                source[rarity].findSplice((l) => l === language);
            }
            source[newRarity].push(language);
            source[newRarity].sort();
            source.commonLanguage = source.commonLanguage === language ? null : source.commonLanguage;

            // Remove `commonLanguage` option without full re-render
            if (commonLanguageSelect.value === language) commonLanguageSelect.value = "";
            const option = htmlQuery<HTMLOptionElement>(commonLanguageSelect, `option[value=${language}]`);
            option?.remove();
        }

        droppedEl.dataset.rarity = newRarity;
        data.updateSource(source);
    }

    /** Update the language rarities cache, adding and deleting from sets as necessary. */
    onChangeHomebrewLanguages(languages: HomebrewTag<"languages">[]): void {
        const data = this.data;
        const source = data.toObject();
        const languageSet = new Set(LANGUAGES);
        const updatedLanguages = [...this.moduleLanguages, ...languages.map((l) => l.id)];

        let render = false;

        if (
            source.commonLanguage &&
            !languageSet.has(source.commonLanguage) &&
            !updatedLanguages.includes(source.commonLanguage)
        ) {
            source.commonLanguage = null;
            render = true;
        }

        for (const rarity of ["uncommon", "rare", "secret", "unavailable"] as const) {
            for (const language of source[rarity]) {
                if (!languageSet.has(language) && !updatedLanguages.includes(language)) {
                    source[rarity].findSplice((l) => l === language);
                    render = true;
                }
            }
        }
        data.updateSource(source);

        for (const language of data.common) {
            if (!languageSet.has(language) && !updatedLanguages.includes(language)) {
                data.common.delete(language);
                render = true;
            }
        }

        for (const language of updatedLanguages) {
            if (!LANGUAGE_RARITIES.some((r) => data[r].has(language))) {
                data.common.add(language);
                render = true;
            }
        }

        if (render) this.menu.render();
    }
}
