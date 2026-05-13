class ComponentRegistry {
  constructor() {
    this.loaders = new Map();
    this.loading = new Map();
  }

  register(tag, loader) {
    this.loaders.set(tag, loader);
  }

  has(tag) {
    return this.loaders.has(tag);
  }

  async load(tag) {
    if (customElements.get(tag)) return;

    const loader = this.loaders.get(tag);

    if (!loader) {
      console.warn(`[TBLR] Unknown component: ${tag}`);
      return;
    }

    if (!this.loading.has(tag)) {
      this.loading.set(tag, loader());
    }

    await this.loading.get(tag);
  }

  async loadAll(tags) {
    await Promise.all(tags.map(tag => this.load(tag)));
  }
}

export const registry = new ComponentRegistry();
