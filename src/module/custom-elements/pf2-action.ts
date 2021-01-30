import { ActionGlyph } from '../system/actions/actions';

const template = document.createElement('template');
template.innerHTML = `<slot></slot>`;

class PF2ActionElement extends HTMLElement {
    action?: Function;
    glyph?: ActionGlyph;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    onClick(event: Event) {
        if (this.action) {
            this.action({
                event,
                glyph: this.glyph,
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // Web Component methods
    ///////////////////////////////////////////////////////////////////////////

    static get observedAttributes() {
        return ['action', 'glyph'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'action':
                this.action = game.pf2e.actions[newValue];
                break;
            case 'glyph':
                this.glyph = newValue;
                break;
        }
    }

    connectedCallback() {
        // wrapped in a null check to please the linter
        if (this.shadowRoot) {
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            this.shadowRoot.addEventListener('click', this.onClick.bind(this));
        }
    }

    disconnectedCallback() {
        // wrapped in a null check to please the linter
        if (this.shadowRoot) {
            this.shadowRoot.removeEventListener('click', this.onClick.bind(this));
        }
    }
}

window.customElements.define('pf2-action', PF2ActionElement);
