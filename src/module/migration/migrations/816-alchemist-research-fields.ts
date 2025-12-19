import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { AELikeSource } from "@module/rules/rule-element/ae-like.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { MigrationBase } from "../base.ts";

/**
 * Update rule elements on Bomber, Chirurgeon, Mutagenist, Toxicologist, Research Field, Field Discovery,
 * Greater Field Discovery, Perpetual Infusions, Perpetual Potency and Perpetual Perfection
 */
export class Migration816AlchemistResearchFields extends MigrationBase {
    static override version = 0.816;

    get #bomberSetFlags(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "flags.pf2e.alchemist",
            value: {
                fieldDiscovery: "Compendium.pf2e.class-features.8QAFgy9U8PxEa7Dw",
                greaterFieldDiscovery: "Compendium.pf2e.class-features.RGs4uR3CAvgbtBAA",
                perpetualInfusions: "Compendium.pf2e.class-features.DFQDtT1Van4fFEHi",
                perpetualPerfection: "Compendium.pf2e.class-features.xO90iBD8XNGyaCkz",
                perpetualPotency: "Compendium.pf2e.class-features.8rEVg03QJ71ic3PP",
            },
        };
    }

    get #chirurgeonSetFlags(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "flags.pf2e.alchemist",
            value: {
                fieldDiscovery: "Compendium.pf2e.class-features.qC0Iz6SlG2i9gv6g",
                greaterFieldDiscovery: "Compendium.pf2e.class-features.JJcaVijwRt9dsnac",
                perpetualInfusions: "Compendium.pf2e.class-features.fzvIe6FwwCuIdnjX",
                perpetualPerfection: "Compendium.pf2e.class-features.YByJ9O7oe8wxfbqs",
                perpetualPotency: "Compendium.pf2e.class-features.VS5vkqUQu4n7E28Y",
            },
        };
    }

    get #mutagenistSetFlags(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "flags.pf2e.alchemist",
            value: {
                fieldDiscovery: "Compendium.pf2e.class-features.V4Jt7eDnJBLv5bDj",
                greaterFieldDiscovery: "Compendium.pf2e.class-features.1BKdOJ0HNL6Eg3xw",
                perpetualInfusions: "Compendium.pf2e.class-features.Dug1oaVYejLmYEFt",
                perpetualPerfection: "Compendium.pf2e.class-features.CGetAmSbv06fW7GT",
                perpetualPotency: "Compendium.pf2e.class-features.mZFqRLYOQEqKA8ri",
            },
        };
    }

    get #toxicologistSetFlags(): AELikeSource {
        return {
            key: "ActiveEffectLike",
            mode: "override",
            path: "flags.pf2e.alchemist",
            value: {
                fieldDiscovery: "Compendium.pf2e.class-features.6zo2PJGYoig7nFpR",
                greaterFieldDiscovery: "Compendium.pf2e.class-features.tnqyQrhrZeDtDvcO",
                perpetualInfusions: "Compendium.pf2e.class-features.LlZ5R50z9j8jysZL",
                perpetualPerfection: "Compendium.pf2e.class-features.3R19zS7gERhEX87F",
                perpetualPotency: "Compendium.pf2e.class-features.JOdbVu14phvdjhaY",
            },
        };
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "feat" || !source.system.slug) return;

        if (
            source.system.rules.some(
                (r: MaybeAELikeSource): r is MaybeAELikeSource =>
                    r.key === "ActiveEffectLike" && r.path === "flags.pf2e.alchemist",
            )
        ) {
            return;
        }

        switch (source.system.slug) {
            case "bomber": {
                source.system.rules.push(this.#bomberSetFlags);
                break;
            }
            case "chirurgeon": {
                source.system.rules.push(this.#chirurgeonSetFlags);
                break;
            }
            case "mutagenist": {
                source.system.rules.push(this.#mutagenistSetFlags);
                break;
            }
            case "toxicologist": {
                source.system.rules.push(this.#toxicologistSetFlags);
                break;
            }
        }
    }
}

interface MaybeAELikeSource extends RuleElementSource {
    path?: unknown;
}
