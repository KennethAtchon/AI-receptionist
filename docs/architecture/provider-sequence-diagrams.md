# Provider System Sequence Diagrams

This document provides detailed sequence diagrams showing how the provider system works, from initialization to usage.

## Table of Contents

1. [Provider Initialization Flow](#provider-initialization-flow)
2. [Provider Registration Flow](#provider-registration-flow)
3. [Provider Validation Flow](#provider-validation-flow)
4. [Provider Access Flow (Lazy Loading)](#provider-access-flow-lazy-loading)
5. [Provider Usage Flow](#provider-usage-flow)
6. [Provider Disposal Flow](#provider-disposal-flow)
7. [Complete Lifecycle Flow](#complete-lifecycle-flow)

---

## Provider Initialization Flow

This diagram shows how providers are initialized when the SDK starts up.

```mermaid
sequenceDiagram
    participant Client as AIReceptionist Client
    participant Init as initializeProviders()
    participant Registry as ProviderRegistry
    participant Loader as ProviderLoader
    participant Metadata as PROVIDER_REGISTRY
    participant Proxy as ProviderProxy

    Client->>Init: initializeProviders(config)
    Init->>Registry: new ProviderRegistry()
    Registry-->>Init: registry instance
    
    Init->>Loader: new ProviderLoader(PROVIDER_REGISTRY)
    Loader-->>Init: loader instance
    
    Init->>Loader: registerProviders(registry, config)
    
    Note over Loader,Metadata: Registration Phase
    Loader->>Metadata: Read provider metadata
    Metadata-->>Loader: Provider metadata
    
    loop For each configured provider
        Loader->>Loader: Check if provider configured
        alt Provider is configured
            Loader->>Loader: Dynamic import provider class
            Loader->>Loader: Dynamic import validator class
            Loader->>Registry: registerIfConfigured(name, factory, validator, config)
            Registry->>Proxy: new ProviderProxy(name, factory, validator, config)
            Proxy-->>Registry: proxy instance
            Registry->>Registry: Store proxy in Map
        end
    end
    
    Loader-->>Init: Registration complete
    
    Note over Init,Registry: Validation Phase
    Init->>Registry: validateAll()
    
    loop For each registered provider
        Registry->>Proxy: validate()
        Proxy->>Proxy: validateFormat(config)
        alt Format valid
            Proxy->>Proxy: getInstance() [triggers lazy load]
            Proxy->>Proxy: initialize provider
            Proxy->>Proxy: validateConnection(instance)
            Proxy-->>Registry: validated
        else Format invalid
            Proxy-->>Registry: CredentialValidationError
        end
    end
    
    Registry-->>Init: All validated
    Init-->>Client: ProviderRegistry instance
```

---

## Provider Registration Flow

This diagram details how a single provider is registered with the registry.

```mermaid
sequenceDiagram
    participant Loader as ProviderLoader
    participant Metadata as ProviderMetadata
    participant Registry as ProviderRegistry
    participant Proxy as ProviderProxy
    participant Factory as Provider Factory
    participant Validator as Validator Class

    Loader->>Metadata: Read metadata for provider
    Metadata-->>Loader: {name, factory, validatorFactory, configPath}
    
    Loader->>Factory: metadata.factory() [dynamic import]
    Factory-->>Loader: Provider class
    
    Loader->>Validator: metadata.validatorFactory() [dynamic import]
    Validator-->>Loader: Validator class
    
    Loader->>Registry: registerIfConfigured(name, factoryFn, validator, config)
    
    Note over Registry,Proxy: Create Proxy
    Registry->>Proxy: new ProviderProxy(name, factory, validator, config)
    Proxy-->>Registry: proxy instance (not yet loaded)
    
    Registry->>Registry: providers.set(name, proxy)
    Registry-->>Loader: Provider registered
```

---

## Provider Validation Flow

This diagram shows the two-phase validation process that occurs during initialization.

```mermaid
sequenceDiagram
    participant Registry as ProviderRegistry
    participant Proxy as ProviderProxy
    participant Validator as CredentialValidator
    participant Provider as Provider Instance
    participant API as External API

    Registry->>Proxy: validate()
    
    Note over Proxy,Validator: Phase 1: Format Validation
    Proxy->>Validator: validateFormat(config)
    Validator->>Validator: Check required fields
    Validator->>Validator: Check field formats
    Validator-->>Proxy: ValidationResult
    
    alt Format validation failed
        Proxy-->>Registry: CredentialValidationError
    else Format validation passed
        Note over Proxy,API: Phase 2: Connection Validation
        Proxy->>Proxy: getInstance() [lazy load]
        Proxy->>Provider: new ProviderClass(config)
        Provider->>Provider: initialize()
        Provider-->>Proxy: provider instance
        
        Proxy->>Validator: validateConnection(provider)
        Validator->>Provider: healthCheck()
        Provider->>API: API call (test connection)
        API-->>Provider: response
        Provider-->>Validator: health status
        Validator-->>Proxy: ValidationResult
        
        alt Connection validation failed
            Proxy-->>Registry: CredentialValidationError
        else Connection validation passed
            Proxy->>Proxy: validated = true
            Proxy-->>Registry: Validation successful
        end
    end
```

---

## Provider Access Flow (Lazy Loading)

This diagram shows how providers are lazily loaded when first accessed.

```mermaid
sequenceDiagram
    participant Client as Client Code
    participant Registry as ProviderRegistry
    participant Proxy as ProviderProxy
    participant Factory as Factory Function
    participant Provider as Provider Instance

    Client->>Registry: get('twilio')
    
    Registry->>Registry: providers.get('twilio')
    Registry->>Proxy: getInstance()
    
    alt Provider already loaded
        Proxy->>Proxy: Check if instance exists
        Proxy-->>Registry: existing instance
        Registry-->>Client: Provider instance
    else Provider not loaded
        alt Concurrent request
            Proxy->>Proxy: Check initPromise
            Proxy-->>Registry: existing initPromise
            Registry->>Client: Promise<Provider>
        else First request
            Proxy->>Proxy: initialize()
            Proxy->>Factory: factory() [execute factory]
            Factory->>Provider: new ProviderClass(config)
            Provider->>Provider: initialize()
            Provider-->>Factory: initialized instance
            Factory-->>Proxy: provider instance
            Proxy->>Proxy: instance = provider
            Proxy-->>Registry: provider instance
            Registry-->>Client: Provider instance
        end
    end
```

---

## Provider Usage Flow

This diagram shows how a provider is used after it's been loaded, using Twilio as an example.

```mermaid
sequenceDiagram
    participant Client as Client Code
    participant Service as CallService
    participant Processor as CallProcessor
    participant Registry as ProviderRegistry
    participant Provider as TwilioProvider
    participant SDK as Twilio SDK
    participant API as Twilio API

    Client->>Service: initiateCall(params)
    Service->>Registry: get('twilio')
    
    Note over Registry,Provider: Lazy Loading (if not loaded)
    Registry->>Provider: getInstance()
    Provider-->>Registry: TwilioProvider instance
    Registry-->>Service: TwilioProvider
    
    Service->>Processor: initiateCall(params)
    Processor->>Provider: createClient()
    Provider->>SDK: twilio(accountSid, authToken)
    SDK-->>Provider: Twilio client
    Provider-->>Processor: Twilio client
    
    Processor->>SDK: calls.create({...})
    SDK->>API: HTTP POST /Accounts/.../Calls.json
    API-->>SDK: {callSid: 'CA...'}
    SDK-->>Processor: Call object
    Processor-->>Service: {callSid}
    Service-->>Client: CallSession
```

---

## Provider Disposal Flow

This diagram shows how providers are cleaned up when the SDK shuts down.

```mermaid
sequenceDiagram
    participant Client as AIReceptionist Client
    participant Registry as ProviderRegistry
    participant Proxy as ProviderProxy
    participant Provider as Provider Instance

    Client->>Registry: disposeAll()
    
    Registry->>Registry: Iterate over all providers
    
    loop For each provider
        Registry->>Proxy: dispose()
        
        alt Provider is loaded
            Proxy->>Provider: dispose()
            Provider->>Provider: Cleanup resources
            Provider-->>Proxy: disposed
            Proxy->>Proxy: instance = undefined
            Proxy->>Proxy: initPromise = undefined
            Proxy->>Proxy: validated = false
        end
        
        Proxy-->>Registry: Disposed
    end
    
    Registry->>Registry: providers.clear()
    Registry->>Registry: validated = false
    Registry-->>Client: All providers disposed
```

---

## Complete Lifecycle Flow

This comprehensive diagram shows the complete lifecycle from initialization to disposal.

```mermaid
sequenceDiagram
    participant User as User Code
    participant Client as AIReceptionist
    participant Init as initializeProviders()
    participant Registry as ProviderRegistry
    participant Loader as ProviderLoader
    participant Proxy as ProviderProxy
    participant Provider as Provider
    participant API as External API

    Note over User,API: Initialization Phase
    User->>Client: new AIReceptionist(config)
    User->>Client: initialize()
    Client->>Init: initializeProviders(config)
    
    Init->>Registry: new ProviderRegistry()
    Init->>Loader: new ProviderLoader(PROVIDER_REGISTRY)
    Init->>Loader: registerProviders(registry, config)
    
    loop For each configured provider
        Loader->>Loader: Dynamic import provider & validator
        Loader->>Registry: registerIfConfigured(...)
        Registry->>Proxy: new ProviderProxy(...)
        Registry->>Registry: Store proxy
    end
    
    Init->>Registry: validateAll()
    
    loop For each registered provider
        Registry->>Proxy: validate()
        Proxy->>Proxy: validateFormat()
        Proxy->>Proxy: getInstance() [lazy load]
        Proxy->>Provider: new & initialize()
        Provider->>API: healthCheck()
        API-->>Provider: OK
        Proxy->>Proxy: validateConnection()
        Proxy-->>Registry: Validated
    end
    
    Registry-->>Init: All validated
    Init-->>Client: Registry ready
    Client-->>User: Initialized
    
    Note over User,API: Usage Phase
    User->>Client: Use provider (e.g., sendSMS)
    Client->>Registry: get('twilio')
    Registry->>Proxy: getInstance()
    
    alt First access
        Proxy->>Provider: new & initialize()
        Provider-->>Proxy: Instance ready
    else Already loaded
        Proxy-->>Registry: Existing instance
    end
    
    Registry-->>Client: Provider instance
    Client->>Provider: sendSMS(...)
    Provider->>API: API call
    API-->>Provider: Response
    Provider-->>Client: Result
    Client-->>User: Success
    
    Note over User,API: Disposal Phase
    User->>Client: dispose()
    Client->>Registry: disposeAll()
    
    loop For each provider
        Registry->>Proxy: dispose()
        Proxy->>Provider: dispose()
        Provider-->>Proxy: Cleaned up
        Proxy->>Proxy: Reset state
    end
    
    Registry->>Registry: Clear all providers
    Registry-->>Client: Disposed
    Client-->>User: Disposed
```

---

## Key Design Patterns Used

### 1. Service Locator Pattern
- **ProviderRegistry** acts as a service locator, managing all provider instances
- Centralized access point for providers

### 2. Proxy Pattern
- **ProviderProxy** implements lazy loading
- Transparent access to provider instances
- Defers initialization until first use

### 3. Factory Pattern
- Factory functions create provider instances
- Dynamic imports enable code splitting

### 4. Strategy Pattern
- **ICredentialValidator** interface with multiple implementations
- Each provider type has its own validator strategy

### 5. Metadata Pattern
- **PROVIDER_REGISTRY** contains metadata for auto-discovery
- Enables automatic registration based on configuration

---

## Error Handling Flow

```mermaid
sequenceDiagram
    participant Registry as ProviderRegistry
    participant Proxy as ProviderProxy
    participant Validator as Validator
    participant Provider as Provider

    Registry->>Proxy: validate()
    Proxy->>Validator: validateFormat(config)
    
    alt Format validation fails
        Validator-->>Proxy: {valid: false, error: '...'}
        Proxy-->>Registry: CredentialValidationError
        Registry-->>Registry: Error logged
        Registry-->>Registry: Validation fails (fail-fast)
    else Format validation passes
        Proxy->>Proxy: getInstance()
        Proxy->>Provider: initialize()
        
        alt Initialization fails
            Provider-->>Proxy: Error
            Proxy-->>Registry: ProviderInitializationError
        else Initialization succeeds
            Proxy->>Validator: validateConnection(provider)
            Validator->>Provider: healthCheck()
            
            alt Connection validation fails
                Provider-->>Validator: false
                Validator-->>Proxy: {valid: false}
                Proxy-->>Registry: CredentialValidationError
            else Connection validation succeeds
                Provider-->>Validator: true
                Validator-->>Proxy: {valid: true}
                Proxy-->>Registry: Validation successful
            end
        end
    end
```

---

## Thread Safety in Lazy Loading

The ProviderProxy ensures thread-safe lazy loading:

```mermaid
sequenceDiagram
    participant Request1 as Request 1
    participant Request2 as Request 2
    participant Proxy as ProviderProxy
    participant Factory as Factory Function
    participant Provider as Provider Instance

    par Concurrent Requests
        Request1->>Proxy: getInstance()
        Request2->>Proxy: getInstance()
    end
    
    Proxy->>Proxy: Check if instance exists
    
    alt No instance exists
        Proxy->>Proxy: Check if initPromise exists
        
        alt No initPromise (first request)
            Proxy->>Proxy: initPromise = initialize()
            Request1-->>Proxy: Wait for initPromise
            Request2-->>Proxy: Wait for initPromise
        else initPromise exists (concurrent request)
            Request1-->>Proxy: Wait for existing initPromise
            Request2-->>Proxy: Wait for existing initPromise
        end
        
        Proxy->>Factory: factory()
        Factory->>Provider: new Provider()
        Provider-->>Factory: Instance
        Factory-->>Proxy: Instance
        Proxy->>Proxy: instance = Provider
        Proxy->>Proxy: initPromise = undefined
        
        Proxy-->>Request1: Provider instance
        Proxy-->>Request2: Provider instance
    else Instance exists
        Proxy-->>Request1: Existing instance
        Proxy-->>Request2: Existing instance
    end
```

---

## Summary

The provider system uses a sophisticated architecture that:

1. **Auto-discovers** providers using metadata
2. **Lazy loads** providers only when needed
3. **Validates** credentials early to fail fast
4. **Thread-safe** concurrent access handling
5. **Clean disposal** of resources

All of these patterns work together to provide a robust, scalable provider management system that integrates seamlessly with external services while maintaining excellent performance and developer experience.

