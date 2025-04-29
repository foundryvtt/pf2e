/** Partial TinyMCE types to avoid having an old version of TinyMCE as a dev dependency.
 *  Remove once TinyMCE is no longer in use.
 */
export namespace TinyMCE {
    class Editor {}

    interface EditorOptions {
        content_css: string[];
        extended_valid_elements?: string;
        style_formats: AllowedFormat[];
    }

    type AllowedFormat = Separator | FormatReference | StyleFormat | NestedFormatting;

    type StyleFormat = BlockStyleFormat | InlineStyleFormat | SelectorStyleFormat;

    interface Separator {
        title: string;
    }

    interface FormatReference {
        title: string;
        format: string;
        icon?: string;
    }

    interface NestedFormatting {
        title: string;
        items: Array<FormatReference | StyleFormat>;
    }

    interface CommonStyleFormat {
        name?: string;
        title: string;
        icon?: string;
    }

    interface BlockStyleFormat extends BlockFormat, CommonStyleFormat {}

    interface InlineStyleFormat extends InlineFormat, CommonStyleFormat {}

    interface SelectorStyleFormat extends SelectorFormat, CommonStyleFormat {}

    type ApplyFormat = BlockFormat | InlineFormat | SelectorFormat;

    type RemoveFormat = RemoveBlockFormat | RemoveInlineFormat | RemoveSelectorFormat;

    type Format = ApplyFormat | RemoveFormat;

    type Formats = Record<string, Format | Format[]>;

    type FormatAttrOrStyleValue = string | ((vars?: FormatVars) => string | null);

    type FormatVars = Record<string, string | null>;

    interface BaseFormat<T> {
        ceFalseOverride?: boolean;
        classes?: string | string[];
        collapsed?: boolean;
        exact?: boolean;
        expand?: boolean;
        links?: boolean;
        mixed?: boolean;
        block_expand?: boolean;
        onmatch?: (node: Element, fmt: T, itemName: string) => boolean;
        remove?: "none" | "empty" | "all";
        remove_similar?: boolean;
        split?: boolean;
        deep?: boolean;
        preserve_attributes?: string[];
    }

    interface Block {
        block: string;
        list_block?: string;
        wrapper?: boolean;
    }

    interface Inline {
        inline: string;
    }

    interface Selector {
        selector: string;
        inherit?: boolean;
    }

    interface RangeLikeObject {
        startContainer: Node;
        startOffset: number;
        endContainer: Node;
        endOffset: number;
    }

    interface CommonFormat<T> extends BaseFormat<T> {
        attributes?: Record<string, FormatAttrOrStyleValue>;
        styles?: Record<string, FormatAttrOrStyleValue>;
        toggle?: boolean;
        preview?: string | false;
        onformat?: (elm: Element, fmt: T, vars?: FormatVars, node?: Node | RangeLikeObject | null) => void;
        clear_child_styles?: boolean;
        merge_siblings?: boolean;
        merge_with_parents?: boolean;
    }

    interface BlockFormat extends Block, CommonFormat<BlockFormat> {}

    interface InlineFormat extends Inline, CommonFormat<InlineFormat> {}

    interface SelectorFormat extends Selector, CommonFormat<SelectorFormat> {}

    interface CommonRemoveFormat<T> extends BaseFormat<T> {
        attributes?: string[] | Record<string, FormatAttrOrStyleValue>;
        styles?: string[] | Record<string, FormatAttrOrStyleValue>;
    }

    interface RemoveBlockFormat extends Block, CommonRemoveFormat<RemoveBlockFormat> {}

    interface RemoveInlineFormat extends Inline, CommonRemoveFormat<RemoveInlineFormat> {}

    interface RemoveSelectorFormat extends Selector, CommonRemoveFormat<RemoveSelectorFormat> {}
}
