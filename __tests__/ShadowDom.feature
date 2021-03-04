Feature: Shadow DOM

    Listeners will and providers work across shadow-dom boundaries

    Scenario: A listener will connect to a provider if it's started inside of a shadow dom
        Given a provider that is connected to the root document
        And the provider is started
        When a listener starts in a shadow dom
        Then the provider will be connected to that listener
        And will call `onConnect` on the listener, providing initial value