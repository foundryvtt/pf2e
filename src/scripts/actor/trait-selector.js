/**
 * A specialized form used to select damage or condition types which apply to an Actor
 * @type {FormApplication}
 */
class TraitSelector5e extends FormApplication {
  static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.id = 'trait-selector';
	  options.classes = ['pf2e'];
	  options.title = 'Actor Trait Selection';
	  options.template = 'systems/pf2e/templates/actors/trait-selector.html';
	  options.width = "auto";
	  return options;
  }

  /* -------------------------------------------- */

  /**
   * Return a reference to the target attribute
   * @type {String}
   */
  get attribute() {
	  return this.options.name;
  }

  /* -------------------------------------------- */

  /**
   * Provide data to the HTML template for rendering
   * @type {Object}
   */
  getData() {
    // Get current values
    const attr = getProperty(this.object.data, this.attribute);
    if (typeof attr.value === 'string') attr.value = this.constructor._backCompat(attr.value, this.options.choices);
    if (!attr.value) attr.value = '';

    const has_values = this.options.has_values;
    const has_exceptions = this.options.has_exceptions;
    const choices = duplicate(this.options.choices);

    // Populate choices
    if (has_values) {
      const selected = [];
      for (const [k, trait] of Object.entries(attr)) {
        selected[trait.type] = { value: trait.value, exceptions: trait.exceptions };
      }
	    for (const [k, v] of Object.entries(choices)) {
	      if (k in selected) {
		      choices[k] = {
		        label: v,
		        chosen: true,
		        value: selected[k].value || "",
		        exceptions: selected[k].exceptions || "",
		      };
        } else {
		      choices[k] = {
		        label: v,
		        chosen: false,
		      };
        }
	    }
    } else {
	    for (const [k, v] of Object.entries(choices)) {
	      choices[k] = {
	        label: v,
	        chosen: attr.value.includes(k),
	      };
	    }
    }

    const ordered_choices = {};
    Object.keys(choices).sort(function(a,b) { return (choices[a].label).localeCompare(choices[b].label) }).forEach(function (key) {
      ordered_choices[key] = choices[key];
    });

     // Return data
	  return {
	    ordered_choices,
	    has_values,
	    has_exceptions,
      custom: attr.custom,
    };
  }

  activateListeners(html) {
      super.activateListeners(html);

      if (this.options.has_values) {
        html.find('input[id^=input_value]').focusin( (ev) => {
          const name = ev.currentTarget.name;
          html.find(`input[type=checkbox][name="${name}"]`).prop('checked', true);
        });
        if (!this.options.allow_empty_values) {
          html.find('input[id^=input_value]').focusout( (ev) => {
            const input = ev.currentTarget;
            if (input.value === "")
              html.find(`input[type=checkbox][name="${input.name}"]`).prop('checked', false);
          });
        }
      }

      if (this.options.has_exceptions) {
        html.find('input[id^=input_exception]').focusin( (ev) => {
          const name = ev.currentTarget.name;
            html.find(`input[type=checkbox][name="${name}]"`).prop('checked', true);
          });
        html.find('input[id^=input_exception]').focusout( (ev) => {
            const input_exception = ev.currentTarget;
            const input_value = html.find(`input[id=input_value][name="${input_exception.name}"]`).val();
            if (input_value === "")
              html.find(`input[type=checkbox][name="${input_exception.name}"]`).prop('checked', false);
          });
      }
  }

  /* -------------------------------------------- */

  /**
   * Support backwards compatibility for old-style string separated traits
   * @private
   */
  static _backCompat(current, choices) {
    if (!current || current.length === 0) return [];
	  current = current.split(/[\s,]/).filter((t) => !!t);
    return current.map((val) => {
      for (const [k, v] of Object.entries(choices)) {
        if (val === v) return k;
      }
      return null;
    }).filter((val) => !!val);
  }

  /* -------------------------------------------- */

  /**
   * Update the Actor object with new trait data processed from the form
   * @private
   */
  _updateObject(event, formData) {
    const choices = [];
    if (this.options.has_values) {
      for (const [k, v] of Object.entries(formData)) {
        if(v.length > 1 && v[0]) {
          if ((!isNaN(v[1]) && v[1] !== "") || this.options.allow_empty_values) {
            const label = this.options.choices[k];
            const exceptions = v[2] || "";
            choices.push({type: k, label: label, value: v[1], exceptions: exceptions});
          }
        }
      }
      this.object.update({ [`${this.attribute}`]: choices });
    } else {
	    for (const [k, v] of Object.entries(formData)) {
        if (v) choices.push(k);
	    }
	    this.object.update({
	      [`${this.attribute}.value`]: choices,
	      [`${this.attribute}.custom`]: formData.custom,
	    });
	  }
   }
}
