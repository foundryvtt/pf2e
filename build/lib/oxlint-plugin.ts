/** Local oxlint rules, loaded through `jsPlugins` in .oxlintrc.json */

import type { Plugin } from "@oxlint/plugins";

const DOM_CLASS_PATTERN = /^(Node|Element|Text|DocumentFragment|(HTML|SVG)\w*Element|\w*Event)$/;

export default {
    meta: { name: "pf2e" },
    rules: {
        "no-dom-instanceof": {
            meta: { type: "problem" },
            create(context) {
                return {
                    BinaryExpression(node) {
                        if (
                            node.operator === "instanceof" &&
                            node.right.type === "Identifier" &&
                            DOM_CLASS_PATTERN.test(node.right.name)
                        ) {
                            context.report({
                                node,
                                message:
                                    "instanceof fails for nodes and events from detached windows: use fu.isElementInstanceOf",
                            });
                        }
                    },
                };
            },
        },
    },
} satisfies Plugin;
