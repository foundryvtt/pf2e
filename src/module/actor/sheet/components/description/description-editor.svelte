<script lang="ts">
    import type { DocumentUUID } from "@client/utils/_module.mjs";
    import * as R from "remeda";
    import type { Attachment } from "svelte/attachments";

    interface DescriptionEditorProps {
        /** The field path, used by the editor's own save handling */
        name: string;
        value: string;
        enriched: string;
        documentUUID: DocumentUUID;
        editable: boolean;
        onchange: (value: string) => void;
    }

    const { name, value, enriched, documentUUID, editable, onchange }: DescriptionEditorProps = $props();

    // Built imperatively: core's element reads its config at construction, and setting `value` later fires a change
    const build = (): HTMLElement => {
        const editor = fa.elements.HTMLProseMirrorElement.create({
            name,
            value,
            enriched,
            documentUUID,
            toggled: true,
            collaborate: false,
            disabled: !editable,
        });
        editor.addEventListener("change", () => onchange(String(editor.value)));
        return editor;
    };

    // Never replace an editor mid-edit, and only rebuild when what it shows changed
    const mountEditor: Attachment<HTMLDivElement> = (host) => {
        let editor: HTMLElement | null = null;
        let built: { value: string; enriched: string; editable: boolean } | null = null;
        $effect(() => {
            const next = { value, enriched, editable };
            if (editor?.classList.contains("active")) return;
            if (built && R.isDeepEqual(built, next)) return;
            const element = build();
            if (editor) editor.replaceWith(element);
            else host.append(element);
            editor = element;
            built = next;
        });
    };
</script>

<div class="description-editor" {@attach mountEditor}></div>

<style>
    .description-editor {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 12rem;

        :global(prose-mirror) {
            flex: 1;
        }

        /* Core shows the toggle as a block with the button padding, which pushes the icon off center */
        :global(prose-mirror:hover button.toggle:enabled) {
            display: grid;
            place-items: center;
            padding: 0;
        }
    }
</style>
