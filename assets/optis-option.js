/* CUSTOM (Hamamdoeken): eigen UI voor een OPTIS (BSS Product Options) optie.
 * De OPTIS-UI zelf is verborgen via CSS; deze component klikt OPTIS' verborgen radio
 * (input[name*="po_radio_button"][key="po_<optienaam>"]) zodat OPTIS de toeslag toepast.
 * De 'value' van onze radio moet exact gelijk zijn aan de OPTIS-waarde.
 * Daarnaast telt het de toeslagen (uit de 'Prijs-tekst' van elke gekozen optie) op bij
 * de getoonde productprijs, zodat de prijs het totaal toont.
 */
if (!customElements.get('optis-option')) {
  // "+ €5,00" -> 500, "- €1.234,50" -> -123450, leeg/geen getal -> 0
  const parsePriceText = (text) => {
    const match = String(text || '').match(/\d[\d.,]*/);
    if (!match) return 0;
    const parts = match[0].replace(/[.,]$/, '').split(/[.,]/);
    let cents;
    if (parts.length > 1 && parts[parts.length - 1].length <= 2) {
      const decimals = parts.pop().padEnd(2, '0');
      cents = parseInt(parts.join('') || '0', 10) * 100 + parseInt(decimals, 10);
    } else {
      cents = parseInt(parts.join(''), 10) * 100;
    }
    return /-\s*\D?\s*\d/.test(text) ? -cents : cents;
  };

  const formatCents = (cents) => {
    const format = window.FoxThemeSettings?.money_format;
    if (typeof formatMoney === 'function' && format) return formatMoney(cents, format);
    return (cents / 100).toLocaleString(document.documentElement.lang || 'nl', {
      style: 'currency',
      currency: window.FoxThemeSettings?.currency_code || 'EUR',
    });
  };

  // Toeslagen van opties die OPTIS zelf toont (bv. checkboxen cadeauverpakking/kaartje), via hun '.po-extra-price'.
  // Verborgen OPTIS-radio's die door een custom blok worden aangestuurd slaan we over (die tellen al mee).
  const optisNativeSurcharge = (scope) => {
    const customKeys = Array.from(scope.querySelectorAll('optis-option')).map((el) => el.dataset.optisKey);
    let sum = 0;
    scope.querySelectorAll('.bss-po-option-set input:checked').forEach((input) => {
      if (customKeys.includes(input.getAttribute('key'))) return;
      const priceEl = input.closest('label')?.querySelector('.po-extra-price');
      if (priceEl) sum += parsePriceText(priceEl.textContent);
    });
    scope.querySelectorAll('.bss-po-option-set select').forEach((select) => {
      const option = select.selectedOptions[0];
      if (option && option.value) sum += parsePriceText(option.textContent.match(/\(([^)]*)\)/)?.[1]);
    });
    return sum;
  };

  // Herberekent de prijs(zen) binnen één product-info: basisprijs variant + som van gekozen toeslagen.
  const updateTotalPrice = (scope) => {
    if (!scope) return;
    const surcharge =
      Array.from(scope.querySelectorAll('optis-option:not([hidden]) .f-optis-option__input:checked')).reduce(
        (sum, input) => sum + parsePriceText(input.dataset.optisPrice),
        0
      ) + optisNativeSurcharge(scope);
    scope.querySelectorAll('[id^="Price-"] .f-price[data-base-price]').forEach((priceEl) => {
      const price = formatCents(parseInt(priceEl.dataset.basePrice, 10) + surcharge);
      priceEl
        .querySelectorAll('.f-price__regular .f-price-item--regular, .f-price__sale .f-price-item--sale')
        .forEach((el) => (el.textContent = price));
      const compare = parseInt(priceEl.dataset.baseComparePrice, 10);
      if (compare > 0) {
        priceEl
          .querySelectorAll('.f-price__sale s.f-price-item--regular')
          .forEach((el) => (el.textContent = formatCents(compare + surcharge)));
      }
    });
  };

  // Bij variantwissel vervangt product-info.js de prijs-HTML door de basisprijs: toeslagen opnieuw optellen.
  document.addEventListener('variant:changed', () => {
    document.querySelectorAll('product-info').forEach((scope) => {
      if (scope.querySelector('optis-option, .bss-po-option-set')) updateTotalPrice(scope);
    });
  });

  // Keuzes in de OPTIS-UI zelf (checkbox/radio/select)
  document.addEventListener('change', (event) => {
    if (event.target.closest?.('.bss-po-option-set')) updateTotalPrice(event.target.closest('product-info'));
  });

  class OptisOption extends HTMLElement {
    connectedCallback() {
      this.key = this.dataset.optisKey;
      this.inputs = Array.from(this.querySelectorAll('.f-optis-option__input'));
      this.inputs.forEach((input) => {
        input.addEventListener('change', () => {
          if (input.checked) this.syncToOptis(input.value);
          updateTotalPrice(this.closest('product-info'));
        });
      });
      updateTotalPrice(this.closest('product-info'));
      // Wacht tot OPTIS z'n radio's heeft gerenderd, dan blok tonen en de standaardkeuze syncen.
      // Rendert OPTIS de optie niet (product niet gekoppeld), dan blijft het blok verborgen.
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

    // Toeslag in centen uit de OPTIS-optiedata voor een waarde. null = onbekend of geen vast bedrag.
    optisPrice(value) {
      const sets = window.BSS_PO?.optionSets || [];
      const format = (label) => window.BSS_PO?.helper?.formatOptionLabel?.(label) ?? label;
      for (const set of sets) {
        const option = (set.options || []).find(
          (o) => Array.isArray(o.radio_button_value) && 'po_' + format(o.label_on_product) === this.key
        );
        if (!option) continue;
        const index = option.radio_button_value.indexOf(value);
        if (index === -1) return null;
        const extra = option.extra_price || {};
        if (Number(extra.radio_button_extra_price_type?.[index]) !== 0) return null; // alleen vaste bedragen
        return Math.round(parseFloat(extra.radio_button_extra_price?.[index] || 0) * 100);
      }
      return null;
    }

    // Keuzes gelijk trekken met OPTIS: keuzes die OPTIS niet kent verbergen, toeslag uit OPTIS overnemen.
    // Geeft het aantal overgebleven keuzes terug.
    matchWithOptis() {
      const optisValues = this.optisRadios().map((radio) => radio.value);
      let visible = 0;
      this.inputs.forEach((input) => {
        const card = input.closest('.f-optis-option__card');
        const exists = optisValues.includes(input.value);
        card.hidden = !exists;
        input.disabled = !exists;
        if (!exists) {
          input.checked = false;
          return;
        }
        visible++;
        const cents = this.optisPrice(input.value);
        if (cents === null) return;
        const text = '+ ' + formatCents(cents);
        input.dataset.optisPrice = text;
        let priceEl = card.querySelector('.f-optis-option__price');
        if (!priceEl) {
          priceEl = document.createElement('span');
          priceEl.className = 'f-optis-option__price';
          card.querySelector('.f-optis-option__text')?.appendChild(priceEl);
        }
        priceEl.textContent = text;
      });
      // Standaardkeuze verborgen? Dan de eerste overgebleven keuze kiezen.
      if (visible && !this.inputs.some((input) => input.checked)) {
        this.inputs.find((input) => !input.disabled).checked = true;
      }
      return visible;
    }

    waitForOptis(attempt = 0) {
      if (this.optisRadios().length) {
        // Product is in OPTIS gekoppeld aan deze optie: blok tonen als er keuzes overeenkomen.
        if (!this.matchWithOptis()) return;
        this.hidden = false;
        updateTotalPrice(this.closest('product-info'));
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
