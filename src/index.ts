type Resolve<T> = (value?: T | PromiseLike<T>) => void;

type PromiseFactory<T> = (val: T) => Promise<unknown>;
type Callback<T> = (val: T) => unknown;

export class RequestEvent<T> extends CustomEvent<PromiseFactory<T>> {
  constructor(context: string, promiseFactory: PromiseFactory<T>) {
    super(context, {
      bubbles: true,
      cancelable: true,
      detail: promiseFactory,
    });
  }
}

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
      onStatus?: (status: string) => unknown;
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

  promise: Promise<T> = new Promise((resolve) => {
    this.resolvePromise = resolve;
  });
  resolvePromise: Resolve<T>;
  connected: boolean = false;

  _status: string;
  onChange: (next: T) => unknown;
  onStatus: (status: string) => unknown;
  element: HTMLElement;
  // context:T;

  constructor({
    contextName,
    element,
    onChange,
    onStatus,
  }: BaseProps & { onChange: Callback<T>; onStatus?: Callback<string> }) {
    this.contextName = contextName;
    this.element = element;
    this.onChange = onChange;
    this.onStatus = onStatus;
  }

  set status(next: string) {
    this._status = next;
    this.onStatus(next);
  }

  setContext = async (context: T) => {
    this.status = "Connected" + context;
    if (!this.connected) {
      this.connected = true;
    }
    // this.context = context;
    this.onChange(context);
    return this.promise;
  };

  start() {
    let attempts = 0;
    this.status = "Attempt " + attempts;
    const tryConnect = () => {
      if (!this.connected) {
        attempts++;

        const event = new RequestEvent("name", this.setContext);
        this.element.dispatchEvent(event);
        console.log("Fired event", event, "on", this.element);

        // this.mountEmitter.emit(this.setContext);
        if (attempts < 10) {
          this.status = "Attempt " + attempts;
          setTimeout(tryConnect, 100);
        } else {
          this.status = "timeout";
          throw new Error(
            `${this.constructor.name} Gave up trying to connect to provider`
          );
        }
      }
    };

    tryConnect();
    setTimeout(tryConnect, 100);
  }
  stop() {
    this.resolvePromise();
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
  consumers: PromiseFactory<unknown>[] = [];

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
    this.consumers.forEach((consumer) => consumer(next));
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

    // When a component unloads, it passes off responsibility to it's parent enclosing elements
    this.consumers.map((consumer) => {
      const event = new RequestEvent(this.contextName, consumer);
      this.element.dispatchEvent(event);
    });
  }

  async mountConsumer(event: CustomEvent) {
    // This supports nested providers by preventing parent elements from receing the request to subscribe
    console.log("Saw event", event);
    event.stopPropagation();
    this.consumers = [...this.consumers, event.detail];

    await event.detail(this.current);

    this.consumers = removeElement(this.consumers, event.detail);
  }
}

function removeElement<T>(arr: T[], element: T) {
  const index = arr.indexOf(element);
  const newArr = arr.slice(0, index).concat(arr.slice(index + 1, arr.length));
  return newArr;
}
