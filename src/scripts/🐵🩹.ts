import { TextEditorPF2e } from "@system/text-editor";

export class MonkeyPatcher {
    static patchTextEditor(): void {
        TextEditor.enrichHTML = TextEditorPF2e.enrichHTML;
        TextEditor._createInlineRoll = TextEditorPF2e._createInlineRoll;
        TextEditor._onClickInlineRoll = TextEditorPF2e._onClickInlineRoll;
    }

    static patchSquareGrid(canvas: DrawnCanvas): void {
        /** Double distance traveled over grid space for every two diagonal spaces  */
        SquareGrid.prototype.measureDistances = function measureDistances(
            segments: Segment[],
            options: MeasureDistancesOptions = {}
        ) {
            if (!options.gridSpaces) return BaseGrid.prototype.measureDistances.call(this, segments, options);

            return segments.map((segment) => {
                // Determine the total distance traveled
                const nx = Math.abs(Math.ceil(segment.ray.dx / canvas.dimensions.size));
                const ny = Math.abs(Math.ceil(segment.ray.dy / canvas.dimensions.size));

                // Determine the number of cardinal and diagonal moves
                const cardinals = Math.abs(ny - nx);
                const diagonals = Math.floor(Math.min(nx, ny) * 1.5);

                return (cardinals + diagonals) * canvas.scene.grid.distance;
            });
        };
    }
}
