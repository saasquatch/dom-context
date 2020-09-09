type Resolve<T> = (value?: T | PromiseLike<T>) => void;

type Detail<T> = {
  onConnect: PromiseFactory<T>;
  onChange: Callback<T>;
  onDisconnect: () => unknown;
};

type PromiseFactory<T> = (val: T) => Promise<unknown>;
type Callback<T> = (val: T) => unknown;

const POLLING = 100;

export const enum ListenerConnectionStatus {
  INITIAL = "Initial",
  CONNECTING = "Connecting",
  CONNECTED = "Connected",
  TIMEOUT = "Timeout",
}

function newRequestEvent<T>(context: string, promiseFactory: Detail<T>) {
  return new CustomEvent<Detail<T>>(context, {
    bubbles: true,
    cancelable: true,
    detail: promiseFactory,
  });
}

export type RequestEvent<T> = CustomEvent<Detail<T>>;


export function createContext<T>(name: string, _initialState?: T) {
  const Provider = class extends ContextProvider<T> {
    constructor({
      element,
      initialState = _initialState,
    }: {
      element: HTMLElement;
      initialState?: T;
    }) {
      super({
        element,
        contextName: name,
        initialState,
      });
    }
  };
  const Listener = class extends ContextListener<T> {
    constructor({
      element,
      onChange,
      onStatus,
    }: {
      element: HTMLElement;
      onChange: (next: T) => unknown;
      onStatus?: Callback<ListenerConnectionStatus>;
    }) {
      super({
        element,
        contextName: name,
        onChange,
        onStatus,
      });
    }
  };
  return {
    Provider,
    Listener,
  };
}

export class ContextListener<T> {
  contextName: string;
  element: HTMLElement;

  resolvePromise?: Resolve<T>;

  _status: ListenerConnectionStatus = ListenerConnectionStatus.INITIAL;
  _onChange: Callback<T>;
  onStatus?: Callback<ListenerConnectionStatus>;

  constructor({
    contextName,
    element,
    onChange,
    onStatus,
  }: BaseProps & {
    onChange: Callback<T>;
    onStatus?: Callback<ListenerConnectionStatus>;
  }) {
    this.contextName = contextName;
    this.element = element;
    this._onChange = onChange;
    this.onStatus = onStatus;
  }

  set status(next: ListenerConnectionStatus) {
    this._status = next;
    this.onStatus(next);
  }
  get status() {
    return this._status;
  }

  onChange = (context: T) => {
    this._onChange(context);
  };

  onConnect = async (context: T) => {
    this.status = ListenerConnectionStatus.CONNECTED;
    this._onChange(context);
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  };

  onDisconnect = () => {
    this.status = ListenerConnectionStatus.CONNECTING;
    this.start();
  };

  start() {
    let attempts = 0;
    this.status = ListenerConnectionStatus.CONNECTING;
    let interval;
    const getStatus = () => this.status;
    const tryConnect = () => {
      if (getStatus() !== ListenerConnectionStatus.CONNECTED) {
        const event = newRequestEvent(this.contextName, {
          onConnect: this.onConnect,
          onChange: this.onChange,
          onDisconnect: this.onDisconnect,
        });
        this.element.dispatchEvent(event);

        if (getStatus() !== ListenerConnectionStatus.CONNECTED) {
          attempts++;
          if (attempts >= 10) {
            clearInterval(interval);

            this.status = ListenerConnectionStatus.TIMEOUT;
            throw new Error(`Gave up trying to connect to provider`);
          }
        } else if (getStatus() === ListenerConnectionStatus.CONNECTED) {
          clearInterval(interval);
        }
      }
    };

    tryConnect();
    interval = setInterval(tryConnect, POLLING);
  }
  stop() {
    this.resolvePromise && this.resolvePromise();
  }
}

type BaseProps = {
  contextName: string;
  element: HTMLElement;
};

export class ContextProvider<T> {
  element: HTMLElement;
  current: T;

  contextName: string;
  consumers: Detail<T>[] = [];

  constructor({
    contextName,
    element,
    initialState,
  }: BaseProps & { initialState?: T }) {
    this.contextName = contextName;
    this.element = element;
    this.current = initialState;
  }

  set context(next: T) {
    this.current = next;
    this.consumers.forEach((consumer) => consumer.onChange(next));
  }

  get context() {
    return this.current;
  }

  start() {
    this.element.addEventListener(
      this.contextName,
      this.mountConsumer.bind(this)
    );
  }
  stop() {
    this.element.removeEventListener(this.contextName, this.mountConsumer);

    this.consumers.map((consumer) => {
      // When a component unloads, it passes off responsibility for re-connecting to a parent back to the child
      consumer.onDisconnect();
    });
  }

  async mountConsumer(event: RequestEvent<T>) {
    // This supports nested providers by preventing parent elements from receing the request to subscribe
    event.stopPropagation();
    this.consumers = [...this.consumers, event.detail];

    await event.detail.onConnect(this.current);

    this.consumers = removeElement(this.consumers, event.detail);
  }
}

function removeElement<T>(arr: T[], element: T) {
  const index = arr.indexOf(element);
  const newArr = arr.slice(0, index).concat(arr.slice(index + 1, arr.length));
  return newArr;
}
