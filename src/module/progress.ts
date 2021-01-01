/**
 * Quick and dirty API around the Loading bar.
 * Does not handle conflicts; multiple instances of this class will fight for the same loading bar, but once all but
 * once are completed, the bar should return to normal
 *
 * @category Other
 */
export class Progress {
    _steps: number;
    _counter: number;
    _label: string;

    constructor({ steps = 1 } = {}) {
        this._steps = steps;
        this._counter = -1;
        this._label = '';
    }

    advance(label) {
        this._counter += 1;
        this._label = label;
        this._updateUI();
    }

    close(label = null) {
        if (label) {
            this._label = label;
        }
        this._counter = this._steps;
        this._updateUI();
    }

    _updateUI() {
        const loader = document.getElementById('loading');
        const pct = Math.clamped((100 * this._counter) / this._steps, 0, 100);
        loader.querySelector('#context').textContent = this._label;
        (loader.querySelector('#loading-bar') as HTMLElement).style.width = `${pct}%`;
        loader.querySelector('#progress').textContent = `${this._counter} / ${this._steps}`;
        loader.style.display = 'block';
        if (this._counter === this._steps && !loader.hidden) $(loader).fadeOut(2000);
    }
}
