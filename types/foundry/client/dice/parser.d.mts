import { RollParseArg, RollParseNode, StringParseNode } from "./_types.mjs";
import RollTerm from "./terms/term.mjs";

/**
 * A class for transforming events from the Peggy grammar lexer into various formats.
 */
export default class RollParser {
    /**
     * @param formula The full formula.
     */
    constructor(formula: string);

    /**
     * The full formula.
     */
    formula: string;

    /* -------------------------------------------- */
    /*  Parse Events                                */
    /* -------------------------------------------- */

    /**
     * Handle some string that failed to be classified.
     * @param term   The term.
     * @param flavor Associated flavor text.
     */
    protected _onStringTerm(term: string, flavor?: string | null): StringParseNode;

    /**
     * Collapse multiple additive operators into a single one.
     * @param operators  A sequence of additive operators.
     */
    protected _collapseOperators(operators: string[]): string;

    /**
     * Wrap a term with a leading minus.
     * @param term  The term to wrap.
     */
    protected _wrapNegativeTerm(term: RollParseNode): RollParseNode;

    /* -------------------------------------------- */
    /*  Tree Manipulation                           */
    /* -------------------------------------------- */

    /**
     * Flatten a tree structure (either a parse tree or AST) into an array with operators in infix notation.
     * @param root The root of the tree.
     */
    static flattenTree(root: RollParseNode): RollParseNode[];

    /**
     * Use the Shunting Yard algorithm to convert a parse tree or list of terms into an AST with correct operator
     * precedence.
     * See https://en.wikipedia.org/wiki/Shunting_yard_algorithm for a description of the algorithm in detail.
     * @param root The root of the parse tree or a list of terms.
     * @returns  The root of the AST.
     */
    static toAST(root: RollParseNode | RollTerm[]): RollParseNode;

    /**
     * Determine if a given node is an operator term.
     */
    static isOperatorTerm(node: RollParseNode | RollTerm): boolean;

    /**
     * Format a list argument.
     * @param list The list to format.
     */
    static formatList(list: RollParseArg[]): string;

    /**
     * Format a parser argument.
     * @param arg The argument.
     */
    static formatArg(arg: RollParseArg): string;

    /**
     * Format arguments for debugging.
     * @param method The method name.
     * @param args The arguments.
     */
    static formatDebug(method: string, ...args: RollParseArg[]): string;
}
