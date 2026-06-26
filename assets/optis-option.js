/* CUSTOM (Hamamdoeken): eigen UI voor een OPTIS (BSS Product Options) optie.
 * De OPTIS-UI zelf is verborgen via CSS; deze component klikt OPTIS' verborgen radio
 * (input[name*="po_radio_button"][key="po_<optienaam>"]) zodat OPTIS de toeslag toepast.
 * De 'value' van onze radio moet exact gelijk zijn aan de OPTIS-waarde.
 */
if (!customElements.get('optis-option')) {
  class OptisOption extends HTMLElement {
    connectedCallback() {
      this.key = this.dataset.optisKey;
      this.inputs = Array.from(this.querySelectorAll('.f-optis-option__input'));
      this.inputs.forEach((input) => {
        input.addEventListener('change', () => {
          if (input.checked) this.syncToOptis(input.value);
        });
      });
      // Wacht tot OPTIS z'n radio's heeft gerenderd, dan de standaardkeuze syncen.
      this.waitForOptis();
    }

    optisRadios() {
      return Array.from(
        document.querySelectorAll(
          'input[type="radio"][name*="po_radio_button"][key="' + this.key + '"]'
        )
      );
    }

    syncToOptis(value) {
      const match = this.optisRadios().find((radio) => radio.value === value);
      if (match && !match.checked) match.click();
    }

    waitForOptis(attempt = 0) {
      if (this.optisRadios().length) {
        const checked = this.querySelector('.f-optis-option__input:checked');
        if (checked) this.syncToOptis(checked.value);
        return;
      }
      if (attempt < 50) {
        setTimeout(() => this.waitForOptis(attempt + 1), 200);
      }
    }
  }

  customElements.define('optis-option', OptisOption);
}
