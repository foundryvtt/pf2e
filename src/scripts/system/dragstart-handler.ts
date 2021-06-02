export interface DropCanvasDataPF2e<T> extends DropCanvasData<T> {
    value?: number;
    level?: number;
}

/**
 * Extends all drag and drop events on entity links to contain PF2e specific information
 * such as condition value and spell level.
 */
export function extendDragData() {
    $('body').on('dragstart', 'a.entity-link', (event: JQuery.DragStartEvent) => {
        const dataTransfer = event?.originalEvent?.dataTransfer;
        if (!dataTransfer) return;

        const data: DropCanvasDataPF2e<Document> = JSON.parse(dataTransfer.getData('text/plain'));

        // Add value field to TextEditor#_onDragEntityLink data. This is mainly used for conditions.
        const name = event?.currentTarget?.innerText?.trim() ?? '';
        const match = name.match(/[0-9]+/);
        if (match !== null) {
            data.value = Number(match[0]);
        }

        // Detect spell level of containing element, if available
        const containerElement = event.target.closest('[data-spell-lvl]');
        const spellLevel = Number(containerElement?.dataset.spellLvl);
        if (spellLevel >= 0) {
            data.level = spellLevel;
        }

        dataTransfer.setData('text/plain', JSON.stringify(data));
    });
}
