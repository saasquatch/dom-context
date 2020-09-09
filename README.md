# dom-context

A context library for web components and vanilla dom. Based on the algorithm proposed by Justin Fagnani.

## Prior art:

-[Dependency Injection with Custom Elements by Justin Fagnani](https://www.youtube.com/watch?v=6o5zaKHedTE&feature=youtu.be). Could be considered the inventor of the `Document-Centric Dependency Resolution` approach that most of the libraries here use.

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
