import { autoBindSteps, loadFeature, StepDefinitions } from "jest-cucumber";

import { e } from "../util/expression";
import { createContext, ContextProvider, ContextListener } from "../src/index";

const features = loadFeature("Connection.feature", { loadRelativePath: true });

const defaultInitial = "initial1";
const defaultContext = createContext<string>("A", defaultInitial);
class World {
  onChange = jest.fn();
  onStatus = jest.fn();
  provider: ContextProvider<unknown>;
  providerMap: Map<string, ContextProvider<unknown>> = new Map();
  listener: ContextListener<unknown>;
  context = defaultContext;
  attempts: number;
}

const steps: StepDefinitions = ({ given, when, then, and, but }) => {
  let world = new World();
  let nestedDiv:HTMLElement;

  beforeEach(() => (world = new World()));
  afterEach(function () {
    world.provider && world.provider.stop();
    world.listener && world.listener.stop();
    // console.log("done");
  });

  given("a provider that is connected to the root document", () => {
    world.provider = new world.context.Provider({
      element: document.documentElement,
    });
  });

  given("the provider is started", () => world.provider.start());

  given(
    e`provider {word} connected to {}`,
    (providerName: string, element: string) => {
      let el: HTMLElement;
      switch (element) {
        case "the document":
          el = document.documentElement;
          break;
        case "a nested div":
          el = document.createElement("div");
          nestedDiv = el;
          document.body.appendChild(el);
          break;
      }
      const provider = new world.context.Provider({
        element: el,
        initialState: providerName
      });
      world.providerMap.set(providerName, provider);
    }
  );

  and("both providers are started", async () => {
    for (let provider of world.providerMap.values()) {
      provider.start();
    }
  });

  when("a listener is started inside of the nested div", () => {
    const div = document.createElement("div");
    nestedDiv.appendChild(div);

    world.listener = new world.context.Listener({
      element: div,
      onChange: world.onChange,
      onStatus: world.onStatus,
      attempts: world.attempts,
    });
    world.listener.start();

  });

  then("provider B will connect to the listener", () => {
    expect(world.onChange.mock.calls.length).toBe(1);
    expect(world.onChange.mock.calls[0][0]).toBe("B");
  });
  but("provider A will not connect", () => {});

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

  then("the provider will receive the event", () => {});

  then("will call `onConnect` on the listener, providing initial value", () =>{
    expect(world.onChange.mock.calls.length).toBe(1);
    expect(world.onChange.mock.calls[0][0]).toBe(defaultInitial);
  }
  );

  given(/^a listener is configured to attempt (\d+) retries$/, function (
    attempts
  ) {
    world.attempts = attempts;
  });

  given("there are no providers as ancestors in the DOM", () => {});

  then(/^it's status is "(.*)"$/, () => {});

  then(/^it will retry (\d+) times$/, () => {});

  then("it will fail to connect", () => {});

  then(/^it's status will be  "(.*)"$/, () => {});
};

autoBindSteps([features], [steps]);
