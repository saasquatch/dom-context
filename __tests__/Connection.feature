Feature: Connection between providers and listeners

    Providers will wait for listeners to connect to them, then provide their context value downstream to them.

    Listeners will attempt to connect to the nearest ancestor for context values.

    Context is always overriden by nested values.

    Scenario: A listener will connect to a provider if it's started
        Given a provider that is connected to the root document
        And the provider is started
        When a listener starts
        Then the provider will be connected to that listener
        And will call `onConnect` on the listener, providing initial value

    Scenario: Only the nearest provider will provide values
        Given provider A connected to the document
        And provider B connected to a nested div
        And both providers are started
        When a listener is started inside of the nested div
        Then provider B will connect to the listener
        But provider A will not connect

    Scenario: Value updates get received by listeners
        Given a provider that is connected to the root document
        And the provider is started
        And a listener is connected
        When the provider sets a new value
        Then the listener recieves the new value via `onChange`
        And the listener recieves the previous value via `onChange`

    Scenario: Listener should stop polling when disconnected
        Given a listener is started inside of the nested div
        Then it won't connect and starts polling
        When the listener is stopped
        Then it should stop polling

    Scenario: Single-attempt listeners should fail immediately
        Given a listener is configured to attempt 1 retries
        When a listener is started inside of the nested div
        Then it's status will be "Timeout"


    @skip
    Scenario: A listener with no provider ancestors will retry until it times out time out
        Given a listener is configured to attempt 10 retries
        And there are no providers as ancestors in the DOM
        Then it's status is "Initial"
        When the listener is started
        Then it's status is "Connecting"
        And it will retry 10 times
        But it will fail to connect
        And it's status will be  "Timeout"

    @skip
    Scenario: Only listeners and providers using the same context name connect
        Given a provider connected to the document for contextName "context-a"
        When a listener is started for contextName "context-b"
        Then the listener will timeout trying to connect

    @skip
    Scenario: Nested providers don't affect other context names
        Given provider A connected to the document for contextName "context-a"
        And provider B connected to a nested div "context-b"
        When a listener is started for contextName "context-a"
        Then provider A will be connected

    @skip
    Scenario: Listener disconnects are handled by providers
        Given a listener is connected to a provider
        When the listener disconnects
        And the providers context is updated
        Then the listener should not be notified

    @skip
    Scenario: Provider disconnects are handled by listeners
        Given a listener is connected to a provider
        When the provider disconnects
        Then the listener will attempt to reconnect
        But it will time out

    @skip
    Scenario: Listeners should reconnect to the next nearest provider
        Given provider A connected to the document
        And provider B connected to a nested div
        And a listener is connected to provider B
        When provider B disconnects
        Then the listener should reconnect to provider A

