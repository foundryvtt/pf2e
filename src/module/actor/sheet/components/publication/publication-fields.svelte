<script lang="ts">
    import type { PublicationData } from "@module/data.ts";
    import { commitInput } from "../inputs/helpers.ts";
    import SelectInput from "../inputs/select-input.svelte";
    import TextInput from "../inputs/text-input.svelte";
    import SheetSection from "../layout/sheet-section.svelte";

    interface PublicationFieldsProps {
        publication: PublicationData;
        /** The publication field's data path, for the inputs' names */
        path: string;
        disabled: boolean;
        /** Store a publication field, resolving to the value now stored */
        onUpdate: <K extends keyof PublicationData>(key: K, value: PublicationData[K]) => Promise<unknown>;
    }

    const { publication, path, disabled, onUpdate }: PublicationFieldsProps = $props();

    const licenses = [
        { value: "OGL", label: _loc("PF2E.Publication.License.OGL") },
        { value: "ORC", label: _loc("PF2E.Publication.License.ORC") },
    ];
</script>

<SheetSection label={_loc("PF2E.Publication.Label")} class="publication">
    <div class="fields">
        <TextInput
            class="title"
            name="{path}.title"
            value={publication.title}
            placeholder={_loc("PF2E.Publication.Title")}
            aria-label={_loc("PF2E.Publication.Title")}
            {disabled}
            onCommit={(value) => onUpdate("title", value)}
        />
        <label>
            <span>{_loc("PF2E.Publication.Authors")}</span>
            <TextInput
                name="{path}.authors"
                value={publication.authors}
                {disabled}
                onCommit={(value) => onUpdate("authors", value)}
            />
        </label>
        <label>
            <span>{_loc("PF2E.Publication.License.Label")}</span>
            <SelectInput
                name="{path}.license"
                value={publication.license}
                options={licenses}
                {disabled}
                onCommit={(value) => onUpdate("license", value === "ORC" ? "ORC" : "OGL")}
            />
        </label>
        <label>
            <span>{_loc("PF2E.Publication.Remaster")}</span>
            <input
                type="checkbox"
                name="{path}.remaster"
                checked={publication.remaster}
                {disabled}
                onchange={(event) => {
                    const input = event.currentTarget;
                    return commitInput(input, () => onUpdate("remaster", input.checked));
                }}
            />
        </label>
    </div>
</SheetSection>

<style>
    .fields {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: var(--spacer-4) var(--spacer-8);

        > :global(.title) {
            grid-column: 1 / -1;
        }

        label {
            display: flex;
            align-items: center;
            gap: var(--spacer-4);
            white-space: nowrap;

            span {
                color: var(--color-form-label);
            }
        }
    }
</style>
