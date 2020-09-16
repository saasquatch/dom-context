import { createContext, ContextProvider, ContextListener } from "../src/index";

import {
  Given,
  When,
  Then,
  setWorldConstructor,
  BeforeAll,
  Before,
  After,
} from "cucumber";
// import inject from "jsdom-global";
import { assert, fake } from "sinon";
const inject = require("jsdom-global");

const defaultInitial = "initial1";
const defaultContext = createContext<string>("A", defaultInitial);

class World {
  onChange = fake();
  onStatus = fake();
  provider: ContextProvider<unknown>;
  listener: ContextListener<unknown>;
  context = defaultContext;
  attempts: number;
}
setWorldConstructor(World);

let jsDomCleanup;
Before(function (this: World) {
  jsDomCleanup = inject();
});
After(function () {
  this.provider && this.provider.stop();
  this.listener && this.listener.stop();
  jsDomCleanup && jsDomCleanup();
  console.log("done");
});

Given("a provider that is connected to the root document", function (
  this: World
) {
  this.provider = new this.context.Provider({
    element: document.documentElement,
  });
});

Given("the provider is started", function (this: World) {
  this.provider.start();
});

When("a/the listener (is started)(starts)", function (this: World) {
  const div = document.createElement("div");
  document.documentElement.appendChild(div);

  this.listener = new this.context.Listener({
    element: div,
    onChange: this.onChange,
    onStatus: this.onStatus,
    attempts: this.attempts
  });
  this.listener.start();
});

Then("the provider will receive the event", function (this: World) {
  // Write code here that turns the phrase above into concrete actions
});

Then(
  "will call `onConnect` on the listener, providing initial value",
  function (this: World) {
    assert.calledOnceWithExactly(this.onChange, defaultInitial);
  }
);

Given(
  "a listener is configured to attempt {int} retries",
  function (this: World, attempts) {
    this.attempts = attempts;
  }
);

Given("there are no providers as ancestors in the DOM", function () {

});

Then("it's status (is)(will be) {string}", function (this:World, status) {
  return "pending";

});

Then("it will retry {int} times", function (this:World, attempts) {
  this.onStatus.
  
 });

Then("it will fail to connect", function () {
  // Write code here that turns the phrase above into concrete actions
  return "pending";
});

Then("it's status will be  {string}", function (string) {
  // Write code here that turns the phrase above into concrete actions
  return "pending";
});
