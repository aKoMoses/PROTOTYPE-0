// Base class for page modules
export class PageBase {
  constructor(viewKey) {
    this.viewKey = viewKey;
    this.container = null;
    this.refs = {};
  }

  mount(container) {
    this.container = container;
    // Override to construct HTML and query DOM
  }

  activate() {
    // Override to handle view becoming visible
  }

  deactivate() {
    // Override to handle navigating away
  }

  dispose() {
    // Override for hard reset
    this.container = null;
    this.refs = {};
  }

  $(selector) {
    return this.container?.querySelector(selector);
  }

  $$(selector) {
    return this.container?.querySelectorAll(selector);
  }
}
