/**
 * Quick and dirty API around the Loading bar.
 * Does not handle conflicts; multiple instances of this class will fight for the same loading bar, but once all but
 * once are completed, the bar should return to normal
 *
 * @category Other
 */
class Progress {
    #steps: number;
    #counter: number;

    constructor({ steps = 1 } = {}) {
        this.#steps = steps;
        this.#counter = -1;
    }

    advance(label: string): void {
        this.#counter += 1;
        const pct = Math.floor((100 * this.#counter) / this.#steps);
        SceneNavigation.displayProgressBar({ label, pct });
    }

    close(label?: string): void {
        SceneNavigation.displayProgressBar({ label, pct: 100 });
    }
}

export { Progress };
