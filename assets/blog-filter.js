/* CUSTOM (Hamamdoeken): client-side, real-time tag-filter voor de blog.
 * Toont/verbergt artikel-kaarten op basis van article-tags, met smooth fade.
 * Toggle-gedrag: een actieve tag opnieuw aanklikken zet het filter uit (toont weer alles).
 */
if (!customElements.get('blog-filter')) {
  class BlogFilter extends HTMLElement {
    constructor() {
      super();
      this.activeTag = null;
    }

    connectedCallback() {
      this.pills = Array.from(this.querySelectorAll('[data-blog-filter-pill]'));
      this.items = Array.from(this.querySelectorAll('[data-blog-filter-item]'));
      this.emptyState = this.querySelector('[data-blog-filter-empty]');
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.pills.forEach((pill) => {
        pill.addEventListener('click', () => this.toggle(pill));
      });
    }

    toggle(pill) {
      const tag = pill.dataset.tag;
      this.activeTag = this.activeTag === tag ? null : tag;
      this.apply();
    }

    apply() {
      this.pills.forEach((pill) => {
        const isActive = pill.dataset.tag === this.activeTag;
        pill.classList.toggle('is-active', isActive);
        pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      let visible = 0;
      this.items.forEach((item) => {
        const tags = (item.dataset.tags || '').split('||').filter(Boolean);
        const show = !this.activeTag || tags.includes(this.activeTag);
        if (show) visible += 1;
        this.setItemVisibility(item, show);
      });

      if (this.emptyState) this.emptyState.hidden = visible !== 0;
    }

    setItemVisibility(item, show) {
      if (show) {
        if (item.hidden) {
          item.hidden = false;
          // Forceer reflow zodat de fade-in transitie afspeelt.
          requestAnimationFrame(() => item.classList.remove('is-filtering-out'));
        } else {
          item.classList.remove('is-filtering-out');
        }
        return;
      }

      if (item.hidden) return;

      if (this.reducedMotion) {
        item.classList.add('is-filtering-out');
        item.hidden = true;
        return;
      }

      item.classList.add('is-filtering-out');
      const onEnd = () => {
        if (item.classList.contains('is-filtering-out')) item.hidden = true;
        item.removeEventListener('transitionend', onEnd);
        clearTimeout(safety);
      };
      item.addEventListener('transitionend', onEnd);
      // Vangnet als transitionend niet vuurt (bijv. element buiten beeld).
      const safety = setTimeout(onEnd, 400);
    }
  }

  customElements.define('blog-filter', BlogFilter);
}
