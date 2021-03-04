# dom-context

A context library for web components and vanilla dom. Based on the algorithm proposed by Justin Fagnani. A generic implementation, instead of the 7 tailored libraries listed in "Related projects".

## Forewarning

There is a good chance you don't need to use this library unless you are an author of one of the projects listed in "Related projects" below.

The first library to use this library in production is [stencil-hooks](https://github.com/saasquatch/stencil-hooks).

There are open PRs for [stencil-context](https://github.com/petermikitsh/stencil-context/pull/5) and [stencil-wormhole](https://github.com/mihar-22/stencil-wormhole/pull/1) to use this library.

The long term goal of this project is to get every web component library centralized on using the same technique.

## Getting started

This library is available as `dom-context` on NPM and the expected use case is to import the module as an ES6 module, but other builds are included as well as UMD for getting started with unpkg.

```bash
npm i dom-context
```

The two main elements are `ContextListener` and `ContextProvider`, everything else in the package is just boilerplate for making it easier to create and update these.

```js
import { ContextProvider, ContextListener } from "dom-context";

const contextName = "theme";

const provider = new ContextProvider({
  name: contextName,
  element: document.documentElement,
  initialState: "blue",
});
provider.start();

const div = document.createElement("div");
div.innerText = "empty";
document.documentElement.appendChild(div);

const listener = new ContextListener({
  name: "example:context",
  element: div,
  onChange: (color) => (div.innerText = color),
  onStatus: console.log,
});
listener.start();

setTimeout(() => (provider.context = "red"), 1000);
setTimeout(() => (provider.context = "orange"), 2000);
```

See it working in the [live demo](https://codesandbox.io/s/dom-context-example-14ksw)

## Prior art:

[Dependency Injection with Custom Elements by Justin Fagnani](https://www.youtube.com/watch?v=6o5zaKHedTE&feature=youtu.be) is a presentation that explains why this technique is useful for custom elements. Justin could be considered the inventor of the `Document-Centric Dependency Resolution` approach that most of the libraries in the "Related projects" list use.

## Specification

`dom-context` is both a speficiation for custom events and a helper library for listening and firing those events.

```js
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
  onConnect: PromiseFactory<T>,
  /**
   * should be called whenever the context value changes
   */
  onChange: OnChange<T>,
  /**
   * should be called when the provider disconnects
   */
  onDisconnect: () => unknown,
};

/**
 * The core API spec for dom-context events. See Detail<T>
 */
export type RequestEvent<T> = CustomEvent<Detail<T>>;
```

## Related issues:

Many web component frameworks suffer from this same problem.

- https://github.com/Polymer/lit-element/issues/46
- https://github.com/ionic-team/stencil-state-tunnel/issues/8

## Related projects

- [blikblum/wc-context](https://github.com/blikblum/wc-context) - uses the same event handler approach, includes integrations with other Web Component libraries, and is well tested, but doesn't support retries/polling. Uses the `context-request-${name}` event namespace. Exposes a core library, so it can be used in other web component compilers.

- [askbeka/wc-context](https://github.com/askbeka/wc-context) - uses the same event handler approach with the `request-context-${contextName}` namespace. Only works with custom elements, so incompatible with Stencil.

- [petermikitsh/stencil-context](https://github.com/petermikitsh/stencil-context) - uses the same event handler approach, but does not support having different context names (everything uses the same shared `mountConsumer` event name)

- [ionic-team/stencil-state-tunnel](https://github.com/ionic-team/stencil-state-tunnel) - doesn't support nested providers ([see issue #8](https://github.com/ionic-team/stencil-state-tunnel/issues/8#issuecomment-655845289)) and requires javascript props on components to wire them up.

- [mihar-22/stencil-wormhole](https://github.com/mihar-22/stencil-wormhole) - uses the same event handler approach with `openWormhole` and `closeWormhole` event names. Only supports using a single object as context, spreads that object to it's children properties.

- [@corpuscule/context](https://github.com/corpusculejs/corpuscule/tree/master/packages/context) - uses the same event handler approach, but uses decorators so it is incompatible with Stencil

- [haunted](https://github.com/matthewp/haunted) - uses the same event handler approach with `haunted.context` event name, but relies on `detail.Context` objects for handling multiple context types. Only exposes `Provider` as custom HTML elements, so doesn't support global providing, or connecting providers into non-custom elements.
