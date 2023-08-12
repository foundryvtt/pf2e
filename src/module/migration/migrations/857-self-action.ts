import { ItemSourcePF2e } from "@item/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";

/** Convert all "action:*" roll options to "self:action:slug:*" */
export class Migration857SelfAction extends MigrationBase {
    static override version = 0.857;

    #inlinePattern = /\b(?<!(?:igin|self):)action:(?=\w)/g;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "npc") {
            const { details } = source.system;
            details.publicNotes &&= details.publicNotes.replace(this.#inlinePattern, "self:action:slug:");
            details.privateNotes &&= details.privateNotes.replace(this.#inlinePattern, "self:action:slug:");
        } else if (source.type === "hazard") {
            const { attributes, details } = source.system;
            attributes.hp.details &&= attributes.hp.details.replace(this.#inlinePattern, "self:action:slug:");
            attributes.stealth.details &&= attributes.stealth.details.replace(this.#inlinePattern, "self:action:slug:");
            details.description &&= details.description.replace(this.#inlinePattern, "self:action:slug:");
            details.description &&= details.description.replace(this.#inlinePattern, "self:action:slug:");
            details.disable &&= details.disable.replace(this.#inlinePattern, "self:action:slug:");
            details.reset &&= details.reset.replace(this.#inlinePattern, "self:action:slug:");
            details.routine &&= details.routine.replace(this.#inlinePattern, "self:action:slug:");
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = source.system.rules.map((rule: MaybeWithSelectorAndType) => {
            const probablyOrigin =
                (typeof rule.selector === "string" &&
                    ["fortitude", "reflex", "will", "saving-throw"].includes(rule.selector)) ||
                (typeof rule.type === "string" && rule.type.endsWith("-dc"));
            return recursiveReplaceString(rule, (s) =>
                s.replace(/^action:.+$/, (match) => {
                    const withoutPrefix = match.replace(/^action:/, "");
                    const selfOrOrigin = probablyOrigin && !/grab-an-edge|retch/.test(match) ? "origin" : "self";
                    return `${selfOrOrigin}:action:slug:${withoutPrefix}`;
                })
            );
        });

        const { description } = source.system;
        description.value &&= description.value.replace(this.#inlinePattern, "self:action:slug:");
        description.gm &&= description.gm.replace(this.#inlinePattern, "self:action:slug:");

        if (source.type === "lore") {
            for (const variant of Object.values(source.system.variants ?? {})) {
                variant.options &&= variant.options.replace(this.#inlinePattern, "self:action:slug:");
            }
        }
    }
}

interface MaybeWithSelectorAndType extends RuleElementSource {
    selector?: unknown;
    type?: unknown;
}
