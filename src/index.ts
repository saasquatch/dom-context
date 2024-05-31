/**
 * This is the core API for dom-context.
 *
 * This sets up the contract between how Providers and Listeners should interact.
 *
 * When a Listener fires an event, it includes a `detail` as described here.
 *
 * When a Provider receives the event, it should follow this contract:
 *
 *  - `onConnect` should be called immediately and awaited to handle listener disconnects
 *  - `onChange`  should be called whenever the context value changes
 *  - `onDisconnect` should be called when the provider disconnects
 *
 * Everything in this library is just built around simplifying the creation, dispatching and handling of these events,
 * but the foundation is that mutiple libraries can interact via this core interface without needing to use
 * the `dom-context` package directly.
 */
export type Detail<T> = {
  /**
   * Should be called by the Provider to let the Listener know it is connected.
   *
   * The Provider should await the return promise to handle listener disconnects
   */
  onConnect: PromiseFactory<T>;
  /**
   * should be called whenever the context value changes
   */
  onChange: OnChange<T>;
  /**
   * should be called when the provider disconnects
   */
  onDisconnect: () => unknown;
};

/**
 * The core API spec for dom-context events. See Detail<T>
 */
export type RequestEvent<T> = CustomEvent<Detail<T>>;

//
//  Helper Types
//

export type Resolve<T> = (value?: T | PromiseLike<T>) => void;
export type PromiseFactory<T> = (val: T) => Promise<unknown>;
export type OnChange<T> = (val: T, prev?: T) => unknown;
export type Accessor<T> = () => T;
export type AccessorOrValue<T> = Accessor<T> | T;

/**
 * The base options needed by both Providers and Listeners
 */
export type BaseOptions = {
  contextName: string;
  element: AccessorOrValue<HTMLElement>;
};
/**
 * Options needed for creating a listener
 */
export type ListenerOptions<T> = BaseOptions & {
  /**
   * Called whenever a context changes, including for initial value
   */
  onChange: OnChange<T>;
  /**
   * Called whenever the listener status changes.
   */
  onStatus?: OnChange<ListenerConnectionStatus>;

  /**
   * Polling frequency
   */
  pollingMs?: AccessorOrValue<number>;
  /**
   * Number of attempts
   */
  attempts?: AccessorOrValue<number>;
};

/**
 * Options needed for creating a Provider
 */
export type ProviderOptions<T> = BaseOptions & {
  /**
   * Initial state for the provider (optional)
   *
   * Can be a value or an accessor function. When it is an accessor function,
   * then it will be called anytime a listener connects
   */
  initialState?: AccessorOrValue<T>;
};

const POLLING = 100;
const ATTEMPTS = 10;

export const GlobalProviders = Symbol("dom-context::globalProvider");

export const enum ListenerConnectionStatus {
  /**
   * A fresh listener that hasn't tried connecting yet
   */
  INITIAL = "Initial",
  /**
   * A listener that is trying to connect or to re-connect
   */
  CONNECTING = "Connecting",
  /**
   * A listener that is connected to a provider
   */
  CONNECTED = "Connected",
  /**
   * A listener that was unable to connect to a provider in the number of attempts
   */
  TIMEOUT = "Timeout",
}

/**
 * Convenience interface for listening to context
 */
export type ListenerContextReference<T> = {
  Listener: {
    new (o: Omit<ListenerOptions<T>, "contextName">): ContextListener<T>;
  };
  listen(o: Omit<ListenerOptions<T>, "contextName">): ContextListener<T>;
};

/**
 * Convenience interface for providing context
 */
export type ProviderContextReference<T> = {
  Provider: {
    new (o: Omit<ProviderOptions<T>, "contextName">): ContextProvider<T>;
  };
  provide(o: Omit<ProviderOptions<T>, "contextName">): ContextProvider<T>;
  provideGlobally(next: T): void;
};

export type ContextReference<T> = ListenerContextReference<T> &
  ProviderContextReference<T> & {
    name: string;
  };

function createEvent<T>(context: string, promiseFactory: Detail<T>) {
  return new CustomEvent<Detail<T>>(context, {
    bubbles: true,
    cancelable: true,
    composed: true,
    detail: promiseFactory,
  });
}

/**
 * Create a Context object to simplify creating Provider and Listeners
 *
 * @param name - the context name
 * @param initialState - initial state for all providers
 */
export function createContext<T>(
  name: string,
  initialState?: AccessorOrValue<T>
): ContextReference<T> {
  const Provider = class extends ContextProvider<T> {
    constructor(options: Omit<ProviderOptions<T>, "contextName">) {
      super({
        ...options,
        contextName: name,
        initialState: options.initialState || initialState,
      });
    }
  };
  const Listener = class extends ContextListener<T> {
    constructor(options: Omit<ListenerOptions<T>, "contextName">) {
      super({
        ...options,
        contextName: name,
      });
    }
  };

  /**
   * Provides this context globally (at the document level)
   *
   * Will lazily create and start a provider, or update using existing provider
   */
  function provideGlobally(next?: T) {
    window[GlobalProviders] = window[GlobalProviders] || {};
    const globalProvider = window[GlobalProviders][name];
    if (!globalProvider) {
      // Lazily creates a global provider
      window[GlobalProviders][name] = new Provider({
        element: document.documentElement,
        initialState,
      }).start();
    } else {
      // Updates the exiting global provider
      globalProvider.context = next;
    }
  }

  function listen(options: Omit<ListenerOptions<T>, "contextName">) {
    return new Listener(options).start();
  }
  function provide(options: Omit<ProviderOptions<T>, "contextName">) {
    return new Provider(options).start();
  }
  return {
    name,
    Provider,
    Listener,
    listen,
    provide,
    provideGlobally,
  };
}

export class ContextListener<T> {
  resolvePromise?: Resolve<T>;
  _status: ListenerConnectionStatus = ListenerConnectionStatus.INITIAL;
  _interval?: NodeJS.Timeout;
  options: ListenerOptions<T>;

  constructor(options: ListenerOptions<T>) {
    this.options = options;
  }

  set status(next: ListenerConnectionStatus) {
    this._status = next;
    this.options.onStatus && this.options.onStatus(next);
  }
  get status() {
    return this._status;
  }

  /* called by provider */
  onChange = (context: T, previous?: T) => {
    this.options.onChange && this.options.onChange(context, previous);
  };

  /* called by provider */
  onConnect = async (context: T) => {
    this.status = ListenerConnectionStatus.CONNECTED;
    this.options.onChange && this.options.onChange(context, context);
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  };

  /* called by provider */
  onDisconnect = () => {
    this.status = ListenerConnectionStatus.CONNECTING;
    this.start();
  };

  /**
   * Starts this Listener
   *
   * Dispatches an event in the dom, which bubbles up to the nearest ancestor that can handle it.
   * If no ancestor handles the event, then will retry a few times and error on failure.
   *
   */
  start() {
    let attempts = 0;
    this.status = ListenerConnectionStatus.CONNECTING;
    const getStatus = () => this.status;
    const maxAttempts = get(this.options.attempts) || ATTEMPTS;
    const pollingMs = get(this.options.pollingMs) || POLLING;
    const tryConnect = () => {
      if (getStatus() !== ListenerConnectionStatus.CONNECTED) {
        const event = createEvent(this.options.contextName, {
          onConnect: this.onConnect,
          onChange: this.onChange,
          onDisconnect: this.onDisconnect,
        });
        get(this.options.element).dispatchEvent(event);

        if (getStatus() !== ListenerConnectionStatus.CONNECTED) {
          attempts++;
          if (attempts >= maxAttempts) {
            this._interval && clearInterval(this._interval);

            this.status = ListenerConnectionStatus.TIMEOUT;
            // throw new Error(`Gave up trying to connect to provider`);
          }
        } else if (getStatus() === ListenerConnectionStatus.CONNECTED) {
          this._interval && clearInterval(this._interval);
        }
      }
    };

    if (pollingMs > 0 && maxAttempts > 1) {
      this._interval = setInterval(
        tryConnect,
        get(this.options.pollingMs) || POLLING
      );
    }
    tryConnect();
    return this;
  }

  /**
   * Sends a signal to a connected provider (if any) to stop sending context changes
   * to this listener
   */
  stop() {
    this._interval && clearInterval(this._interval);
    this.resolvePromise && this.resolvePromise();
    this.status = ListenerConnectionStatus.INITIAL;
    return this;
  }
}

export class ContextProvider<T> {
  options: ProviderOptions<T>;

  private __current: T;
  private __listeners: Detail<T>[] = [];

  constructor(options: ProviderOptions<T>) {
    this.options = options;
    this.__current = get(options.initialState);
  }

  /**
   * Set a new value for context and provides it to all subscribed listeners
   */
  set context(next: T) {
    const prev = this.__current;
    this.__current = next;
    this.__listeners.forEach((consumer) => consumer.onChange(next, prev));
  }

  /**
   * Returns the current value of the context
   */
  get context(): T {
    return get(this.__current);
  }

  get listeners(): readonly Detail<T>[] {
    return Object.freeze([...this.__listeners]);
  }

  /**
   * Starts providing context to listeners lower in the dom.
   *
   * Does this by listening for DOM events that bubble up
   */
  start() {
    get(this.options.element).addEventListener(
      this.options.contextName,
      this.connectListener
    );
    return this;
  }

  /**
   * Stops providing context to listeners lower in the dom.
   *
   * Sends a signal to listeners lower in the dom that they need to reconnect.
   */
  stop() {
    get(this.options.element).removeEventListener(
      this.options.contextName,
      this.connectListener
    );

    this.__listeners.map((consumer) => {
      // When a component unloads, it passes off responsibility for re-connecting to a parent back to the child
      consumer.onDisconnect();
    });
    this.__listeners = [];
    return this;
  }

  connectListener = async (event: RequestEvent<T>) => {
    // This supports nested providers by preventing parent elements from receing the request to subscribe
    event.stopPropagation();
    this.__listeners = [...this.__listeners, event.detail];

    try {
      // This is weird, but it makes sense
      // when `onConnect` is finished, it means that the child is done and can be disconnected
      const current = this.__current;
      await event.detail.onConnect(current);
    } finally {
      this.__listeners = removeElement(this.__listeners, event.detail);
    }
  };
}

//////////////////////////
//
//  Helper Functions
//
//////////////////////////

function removeElement<T>(arr: T[], element: T) {
  const index = arr.indexOf(element);
  const newArr = arr.slice(0, index).concat(arr.slice(index + 1, arr.length));
  return newArr;
}

function get<T>(accessor: AccessorOrValue<T>) {
  return isFunction(accessor) ? accessor() : accessor;
}

function isFunction<T>(x: any): x is Accessor<T> {
  return typeof typeof x === "function";
}
