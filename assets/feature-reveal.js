/* CUSTOM (Hamamdoeken): feature-reveal — klik op een titel toont dat item; het bijbehorende beeld
 * schuift over het vorige en de niet-actieve beelden schalen iets kleiner + schuiven omhoog (peek),
 * zoals waabi.ai. Geen scroll-trigger. */
if (!customElements.get('feature-reveal')) {
  const ACTIVE = 'translateY(0) scale(1)';
  const BEHIND = 'translateY(-3.2rem) scale(0.92)';
  const ENTER = 'translateY(60%) scale(1)';

  class FeatureReveal extends HTMLElement {
    connectedCallback() {
      this.items = Array.from(this.querySelectorAll('[data-fr-item]'));
      this.medias = Array.from(this.querySelectorAll('[data-fr-media]'));
      this.z = 1;
      this.current = 0;

      this.items.forEach((item, i) => {
        const btn = item.querySelector('[data-fr-title]');
        if (btn) btn.addEventListener('click', () => this.activate(i));
      });

      // Beginstand: eerste vol bovenop, de rest in de "behind"-stapel.
      this.medias.forEach((media, i) => {
        if (i === 0) {
          media.style.transform = ACTIVE;
          media.style.zIndex = String(++this.z);
        } else {
          media.style.transform = BEHIND;
        }
      });
    }

    activate(index) {
      if (index === this.current) return;
      this.current = index;

      this.items.forEach((item, i) => {
        const active = i === index;
        item.classList.toggle('is-active', active);
        const btn = item.querySelector('[data-fr-title]');
        if (btn) btn.setAttribute('aria-expanded', active ? 'true' : 'false');
      });

      // Alle andere beelden naar de "behind"-stapel (kleiner + omhoog).
      this.medias.forEach((media, i) => {
        if (i !== index) media.style.transform = BEHIND;
      });

      const media = this.medias[index];
      if (!media) return;

      // Nieuw beeld onderaan klaarzetten (zonder animatie) en bovenop leggen,
      // dan smooth omhoog over de stapel laten schuiven naar de actieve staat.
      media.style.transition = 'none';
      media.style.transform = ENTER;
      media.style.zIndex = String(++this.z);
      void media.offsetWidth;
      media.style.transition = '';
      requestAnimationFrame(() => {
        media.style.transform = ACTIVE;
      });
    }
  }

  customElements.define('feature-reveal', FeatureReveal);
}
