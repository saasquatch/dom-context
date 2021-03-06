import { loadFeature, StepDefinitions } from "jest-cucumber";
import { autoBindSteps } from "@saasquatch/scoped-autobindsteps";
import { e } from "../util/expression";
import {
  createContext,
  ContextProvider,
  ContextListener,
  ListenerConnectionStatus,
} from "../src/index";

const defaultInitial = "initial1";
const defaultContext = createContext<string>("Default-Context", defaultInitial);
class World {
  onChange = jest.fn();
  onStatus = jest.fn();
  provider: ContextProvider<any>;
  providerMap: Map<string, ContextProvider<any>> = new Map();
  listener: ContextListener<any>;
  context = defaultContext;
  attempts: number;
  nestedDiv = (() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    return el;
  })();
}

const steps: StepDefinitions = ({ given, when, then, and, but }) => {
  let world = new World();

  beforeEach(() => {
    world = new World();
  });
  afterEach(() => {
    world.listener && world.listener.stop();
    world.provider && world.provider.stop();
    Array.from(world.providerMap).forEach(([, v]) => v.stop());
    // console.log("done");
  });

  given("a provider that is connected to the root document", () => {
    world.provider = new world.context.Provider({
      element: document.documentElement,
    });
  });

  given("the provider is started", () => world.provider.start());
  then(/^it's status will be "(.*)"$/, (stts) => {
    expect(world.listener.status).toBe(stts);
  });
  given(
    e`provider {word} connected to {}`,
    (providerName: string, element: string) => {
      let el: HTMLElement;
      switch (element) {
        case "the document":
          el = document.documentElement;
          break;
        case "a nested div":
          el = world.nestedDiv;
          break;
      }
      const provider = new world.context.Provider({
        element: el,
        initialState: providerName,
      });
      world.providerMap.set(providerName, provider);
    }
  );

  and("both providers are started", async () => {
    Array.from(world.providerMap).map(([, v]) => v.start());
  });

  then("it should stop polling", () => {
    expect(world.listener.status).toBe(ListenerConnectionStatus.INITIAL);
  });
  then("it won't connect and starts polling", () => {
    expect(world.listener.status).toBe(ListenerConnectionStatus.CONNECTING);
  });

  when("the listener is stopped", () => {
    world.listener.stop();
  });

  when("a listener starts in a shadow dom", () => {
    const div = document.createElement("div");
    world.nestedDiv.appendChild(div);

    // See: https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
    let shadow = div.attachShadow({ mode: "open" });
    let para = document.createElement("p");
    shadow.appendChild(para);
    world.listener = new world.context.Listener({
      element: para,
      onChange: world.onChange,
      onStatus: world.onStatus,
      attempts: world.attempts,
    });
    world.listener.start();
  });

  when("a listener is started inside of the nested div", () => {
    const div = document.createElement("div");
    world.nestedDiv.appendChild(div);

    world.listener = new world.context.Listener({
      element: div,
      onChange: world.onChange,
      onStatus: world.onStatus,
      attempts: world.attempts,
    });
    world.listener.start();
  });

  then("provider B will connect to the listener", () => {
    expect(world.onChange).toHaveBeenNthCalledWith(1, "B");
    // expect(world.onChange.mock.calls.length).toBe(1);
    // expect(world.onChange.mock.calls[0][0]).toBe("B");
  });

  but("provider A will not connect", () => {
    const providerA = world.providerMap.get("A");
    expect(providerA.listeners.length).toBe(0);
  });

  const listenerStart = () => {
    const div = document.createElement("div");
    document.documentElement.appendChild(div);

    world.listener = new world.context.Listener({
      element: div,
      onChange: world.onChange,
      onStatus: world.onStatus,
      attempts: world.attempts,
    });
    world.listener.start();
  };

  when("a listener starts", listenerStart);
  when("the listener starts", listenerStart);
  when("a listener is started", listenerStart);
  when("the listener is started", listenerStart);

  given("a listener is connected", listenerStart);

  when("the provider sets a new value", () => {
    world.provider.context = "new value";
  });

  then("the listener recieves the new value via `onChange`", () => {
    expect(world.onChange).toHaveBeenNthCalledWith(2, "new value");
  });

  then("the provider will be connected to that listener", () => {
    expect(world.provider.listeners.length).toBe(1);
  });

  then("will call `onConnect` on the listener, providing initial value", () => {
    expect(world.onChange).toHaveBeenNthCalledWith(1, defaultInitial);
  });

  given(
    /^a listener is configured to attempt (\d+) retries$/,
    function (attempts) {
      world.attempts = attempts;
    }
  );

  // given("there are no providers as ancestors in the DOM", () => {});

  // then(/^it's status is "(.*)"$/, () => {});

  // then(/^it will retry (\d+) times$/, () => {});

  // then("it will fail to connect", () => {});

  // then(/^it's status will be  "(.*)"$/, () => {});
};

bindFeature("Connection.feature");
bindFeature("ShadowDom.feature");

function bindFeature(file) {
  const features = loadFeature(file, {
    loadRelativePath: true,
    tagFilter: "not @skip",
  });

  const notSkipped = features.scenarios.filter(
    (s) => !s.tags.includes("@skip")
  );

  autoBindSteps(
    [
      {
        ...features,
        scenarios: notSkipped,
      },
    ],
    [steps]
  );
}
