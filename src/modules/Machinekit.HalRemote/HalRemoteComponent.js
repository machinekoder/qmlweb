QmlWeb.registerQmlType({
  module: "Machinekit.HalRemote",
  name: "HalRemoteComponent",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  enums: {
    HalRemoteComponent: {
      Disconnected: 0, Connecting: 1, Connected: 2, Timeout: 3, Error: 4,
      NoError: 0, BindError: 1, PinChangeError: 2, CommandError: 3, SocketError: 4 }
  },
  properties: {
    halrcmdUri: { type: "string", initialValue: "" },
    halrcompUri: { type: "string", initialValue: "" },
    name: { type: "string", initialValue: "default" },
    heartbeatPeriod: { type: "int", initialValue: 3000 },
    connected: { type: "bool", initialValue: false },
    connectionState: { type: "enum", initialValue: 0 }, // Disconnected
    connectionError: { type: "enum", initialValue: 0 }, // NoError
    errorString: { type: "string", initialValue: "" },
    containerItem: { type: "QtQml.Item", initialValue: this },
    create: { type: "bool", initialValue: true },
    bind: { type: "bool", initialValue: true },
    pins: { type: "var", initialValue: [] },
    ready: { type: "bool", initialValue: false },
    required: { type: "bool", initialValue: false }
  }
}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);

    this.$rcomp = new RemoteComponent("anddemo", 0);
    this.$rcomp.bind("addPins", () => this.$addPins() );
    this.$rcomp.bind("removePins", () => this.$removePins() );
    this.$rcomp.bind("setConnected", () => this.$setState(2) );
    this.$rcomp.bind("setConnecting", () => this.$setState(1) );
    this.$rcomp.bind("setDisconnected", () => this.$setState(0) );
    this.$rcomp.bind("setTimeout", () => this.$setState(3) );
    this.$rcomp.bind("setError", () => this.$setState(4) );

    this.readyChanged.connect(this, this.$onReadyChanged);
  }

  $recurseItem(item, list) {
    for (let i = 0; i < item.data.length; ++i)
    {
      let entry = item.data[i];
      if (entry.$class === "HalPin") {
        list.push(entry);
      }
      if (entry.data) {
        this.$recurseItem(entry, list);
      }
    }
  }

  $setState(state) {
    this.connectionState = state;
    this.connected = (state === 2); // Connected
  }

  $addPins() {
    if (this.containerItem === null) {
      return;
    }

    this.pins = [];
    this.$recurseItem(this.containerItem, this.pins);
    this.$rcomp.setPins(this.pins);
  }

  $removePins() {
    this.pins = [];
  }

  $onReadyChanged(ready) {
    if (ready) {
      this.$rcomp.halrcmdUri = this.halrcmdUri;
      this.$rcomp.halrcompUri = this.halrcompUri;
      this.$rcomp.addHalrcompTopic(this.name);
      this.$rcomp.start();
    }
    else {
      this.$rcomp.stop();
      this.connectionError = 0; // NoError
      this.connectionState = 0; // Disconnected
      this.errorString = "";
    }
  }

});
