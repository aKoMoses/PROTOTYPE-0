// Manages page lifecycles
export class ViewManager {
  constructor() {
    this.views = new Map();
    this.activeViewKey = null;
  }

  register(viewKey, instance) {
    this.views.set(viewKey, { instance, mounted: false });
  }

  async switchView(viewKey, container) {
    const previous = this.activeViewKey ? this.views.get(this.activeViewKey) : null;
    
    if (previous && previous.instance) {
      previous.instance.deactivate();
    }

    const current = this.views.get(viewKey);
    if (!current) {
      console.warn(`[ViewManager] View not found: ${viewKey}`);
      return;
    }

    if (!current.mounted && current.instance) {
      await current.instance.mount(container);
      current.mounted = true;
    }

    if (current.instance) {
      current.instance.activate();
    }

    this.activeViewKey = viewKey;
  }
}

export const viewManager = new ViewManager();
