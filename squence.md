## Frontend (Angular) Backend (Socket.io Server)

EnvironmentProxyComponent
| ngOnInit()
|------------------------------------->|
| Initializes forms and subscribes to active environment
|<-------------------------------------|
| Updates environment proxy settings
|------------------------------------->|

SyncService
| init()
|------------------------------------->|
| Fetches cloudSyncUrl from RemoteConfigService
|------------------------------------->|
| Initializes socket.io connection
| socket.connect()
|------------------------------------->|
| Sends deviceId, version, and auth token
|------------------------------------->|
| Backend validates connection
|<-------------------------------------|
| Emits 'connected' event
|------------------------------------->|
| onReceiveConnected()
|------------------------------------->|
| Requests environment list (ENV_LIST)
| socket.emit(SyncMessageTypes.ENV_LIST)
|------------------------------------->|
| Backend sends environment list
|<-------------------------------------|
| onReceiveEnvironmentsList()
|------------------------------------->|
| Compares local and remote environment hashes
|------------------------------------->|
| Pulls or pushes environment changes
| socket.emit(SyncMessageTypes.SYNC)
|------------------------------------->|
| Backend processes sync actions
|<-------------------------------------|
| Acknowledges sync actions
|------------------------------------->|
| Updates local store with acknowledgment
|------------------------------------->|

    | Presence updates
    | socket.emit(SyncMessageTypes.PRESENCE)
    |------------------------------------->|
    | Backend sends presence updates
    |<-------------------------------------|
    | onPresenceUpdate()
    |------------------------------------->|
    | Updates presence in the local store
    |------------------------------------->|

    | Time difference calculation
    | socket.emit(SyncMessageTypes.TIME)
    |------------------------------------->|
    | Backend responds with timestamp
    |<-------------------------------------|
    | calculateTimeDifference()
    |------------------------------------->|
    | Updates time difference in the service
    |------------------------------------->|

    | Disconnection
    | socket.disconnect()
    |------------------------------------->|
    | Backend emits 'disconnect' event
    |<-------------------------------------|
    | onDisconnect()
    |------------------------------------->|
    | Updates local store with offline status
    |------------------------------------->|

````mermaid
sequenceDiagram
    participant FC as Frontend Component
    participant SS as SyncService
    participant SPS as SyncPayloadsService
    participant ST as Store
    participant SO as Socket.io Client
    participant BS as Backend Server

    %% Initialization
    FC->>SS: ngOnInit()
    FC->>FC: initForms()
    FC->>ST: selectActiveEnvironment()
    ST-->>FC: Observable<Environment>

    %% Socket Connection
    FC->>SS: init()
    SS->>SS: setDeviceId()
    SS->>+RemoteConfigService: get('cloudSyncUrl')
    RemoteConfigService-->>-SS: cloudSyncUrl

    SS->>SO: io(cloudSyncUrl, {transports: ['websocket'], query: {deviceId, version, highestMigrationId}, auth: {token}})

    %% Auth and Connection
    SS->>UserService: idTokenChanges()
    UserService-->>SS: token (JWT)
    SS->>SO: socket.auth = {token}
    SS->>SO: socket.connect()
    SO->>BS: connection request {deviceId, version, highestMigrationId, token}

    %% Connection Events
    BS-->>SO: 'connect_error' event (possible)
    SO-->>SS: fromEvent('connect_error')
    SS->>UserService: getIdToken()
    UserService-->>SS: refreshed token
    SS->>SO: socket.auth = {refreshed token}
    SS->>SO: socket.connect()

    %% Successful Connection
    BS-->>SO: SyncMessageTypes.CONNECTED {migrated: boolean}
    SO-->>SS: fromEvent(SyncMessageTypes.CONNECTED)
    SS->>ST: update(updateSyncAction({status: true, offlineReason: null}))

    %% Time Sync
    SS->>SS: calculateTimeDifference()
    SS->>SO: socket.emit(SyncMessageTypes.TIME)
    SO->>BS: SyncMessageTypes.TIME
    BS-->>SO: callback(BaseSyncAction{timestamp})
    SO-->>SS: callback execution
    SS->>SS: timeDifference = data.timestamp - timeStart - roundtripTime/2

    %% Environment List Request
    SS->>SO: socket.emit(SyncMessageTypes.ENV_LIST)
    SO->>BS: SyncMessageTypes.ENV_LIST
    BS-->>SO: SyncMessageTypes.ENV_LIST, EnvironmentsListPayload[{environmentUuid, hash}]
    SO-->>SS: fromEvent(SyncMessageTypes.ENV_LIST)

    %% Process Environment List
    SS->>SPS: computeHash(environment)
    SPS-->>SS: environment hash

    alt Hash comparison: Local changed, Server same
        SS->>SS: sendUpdateFullEnvironment(environmentUuid)
        SS->>SPS: updateFullEnvironmentActionBuilder(environment, timeDifference)
        SPS-->>SS: UpdateFullEnvironmentSyncAction
        SS->>SO: socket.emit(SyncMessageTypes.SYNC, updateFullEnvAction, callback)
        SO->>BS: SyncMessageTypes.SYNC, UpdateFullEnvironmentSyncAction
        BS-->>SO: ServerAcknowledgment{hash, error?}
        SO-->>SS: messageAcknowledgmentCallback execution
        SS->>ST: update(updateSettingsEnvironmentDescriptorAction({uuid, lastServerHash}))
    else Hash comparison: Server changed, Local same
        SS->>SS: sendGetFullEnvironment(environmentUuid, 'UPDATE')
        SS->>SPS: getFullEnvironmentActionBuilder(environmentUuid, 'UPDATE', timeDifference)
        SPS-->>SS: GetFullEnvironmentSyncAction
        SS->>SO: socket.emit(SyncMessageTypes.SYNC, getFullEnvAction, callback)
        SO->>BS: SyncMessageTypes.SYNC, GetFullEnvironmentSyncAction
        BS-->>SO: SyncMessageTypes.SYNC, AddCloudEnvironmentSyncAction{environment}
        SO-->>SS: fromEvent(SyncMessageTypes.SYNC)
        SS->>SPS: applySyncAction(syncAction)
        SPS->>ST: update(environmentActions)
    else Hash comparison: Both changed (conflict)
        SS->>UIService: showConfirmDialog("Conflict detected")
        UIService-->>SS: User decision (boolean)

        alt User chose remote
            SS->>SS: sendGetFullEnvironment(environmentUuid, 'UPDATE')
        else User chose local
            SS->>SS: sendUpdateFullEnvironment(environmentUuid)
        end
    else Hash comparison: Local missing
        SS->>SS: sendGetFullEnvironment(environmentUuid, 'CREATE')
    end

    %% Propagate Store Actions
    SS->>SS: propagateStoreActions()
    SS->>ST: getStoreActions()
    ST-->>SS: Observable<{type, payload}>
    SS->>SPS: canPropagateReducerAction(action)
    SPS-->>SS: boolean
    SS->>SPS: reducerActionToSyncActionBuilder(action, timeDifference)
    SPS-->>SS: SyncAction

    %% Group and process updates
    alt Update action
        SS->>SS: Group by key and debounce 1s
        SS->>SS: Merge properties of same-key actions
        SS->>SPS: saveRecentSyncAction(syncAction)
        SS->>SO: socket.emit(SyncMessageTypes.SYNC, syncAction, callback)
        SO->>BS: SyncMessageTypes.SYNC, UpdatesSyncAction
    else Other action
        SS->>SPS: saveRecentSyncAction(syncAction)
        SS->>SO: socket.emit(SyncMessageTypes.SYNC, syncAction, callback)
        SO->>BS: SyncMessageTypes.SYNC, SyncAction
    end

    %% Receive sync actions from server
    BS-->>SO: SyncMessageTypes.SYNC, DownSyncActions
    SO-->>SS: fromEvent(SyncMessageTypes.SYNC)
    SS->>SPS: computeHash(syncAction)
    SPS-->>SS: hash
    SS->>SS: transformSyncAction(syncAction, recentActionsStore)
    SS->>SPS: saveRecentSyncAction(syncAction)
    SS->>SPS: applySyncAction(syncAction)
    SPS->>ST: update(various actions)

    %% Presence Updates
    BS-->>SO: SyncMessageTypes.PRESENCE, SyncPresence{devices, users}
    SO-->>SS: fromEvent(SyncMessageTypes.PRESENCE)
    SS->>ST: update(updateSyncAction({presence}))

    %% User Presence Updates
    BS-->>SO: SyncMessageTypes.USER_PRESENCE, SyncUserPresence{uid, email, displayName, environmentUuid, cssColor}
    SO-->>SS: fromEvent(SyncMessageTypes.USER_PRESENCE)
    SS->>ST: update(updateSyncAction({presence: updatedPresence}))

    %% Disconnect Flow
    FC->>SS: disconnect()
    SS->>SO: socket.disconnect()
    SO->>BS: disconnect signal
    BS-->>SO: 'disconnect' event
    SO-->>SS: fromEvent('disconnect')
    SS->>ST: update(updateSyncAction({status: false, presence: null, alert: null}))

    %% Reconnect Flow
    FC->>SS: reconnect()
    SS->>SO: socket.connect()
    %% Connection cycle repeats
    ```
````
