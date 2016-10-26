// const Container = machinetalk.protobuf.message.Container;
// const ContainerType = machinetalk.protobuf.message.ContainerType;
// import "../machinetalk/rpcclient.js" as RpcClient;
// import "../halremote/halrcompsubscribe.js" as HalrcompSubscribe;

class RemoteComponentBase {
  constructor(debugname, debuglevel) {
    this.debuglevel = typeof debuglevel !== "undefined" ? debuglevel : 0;
    this.debugname = typeof debugname !== "undefined" ? debugname : 0;
    this.errorString = "";

    // Halrcmd
    this.halrcmdChannel = new RPCClient(`${debugname} halrcmd`,
                                                     debuglevel);
    this.halrcmdChannel.bind("stateChanged",
                             state => this.halrcmdChannelStateChanged(state));
    this.halrcmdChannel.bind("socketMessageReceived",
                             msg => this._halrcmdMessageReceived(msg));

    // Halrcomp
    this.halrcompChannel = new HalrcompSubscribe(`${debugname} halrcomp`,
                                                     debuglevel);
    this.halrcompChannel.bind("stateChanged",
                             state => this.halrcompChannelStateChanged(state));
    this.halrcompChannel.bind("socketMessageReceived",
                             msg => this._halrcompMessageReceived(msg));

    // fsm
    this.fsm = StateMachine.create({
      initial: "down",
      events: [
      { name: "connect", from: "down", to: "trying" },
      { name: "halrcmd_up", from: "trying", to: "bind" },
      { name: "disconnect", from: "trying", to: "down" },
      { name: "halrcomp_bind_msg_sent", from: "bind", to: "binding" },
      { name: "no_bind", from: "bind", to: "syncing" },
      { name: "bind_confirmed", from: "binding", to: "syncing" },
      { name: "bind_rejected", from: "binding", to: "error" },
      { name: "halrcmd_trying", from: "binding", to: "trying" },
      { name: "disconnect", from: "binding", to: "down" },
      { name: "halrcmd_trying", from: "syncing", to: "trying" },
      { name: "halrcomp_up", from: "syncing", to: "synced" },
      { name: "sync_failed", from: "syncing", to: "error" },
      { name: "disconnect", from: "syncing", to: "down" },
      { name: "halrcomp_trying", from: "synced", to: "syncing" },
      { name: "halrcmd_trying", from: "synced", to: "trying" },
      { name: "set_rejected", from: "synced", to: "error" },
      { name: "halrcomp_set_msg_sent", from: "synced", to: "synced" },
      { name: "disconnect", from: "synced", to: "down" },
      { name: "disconnect", from: "error", to: "down" },
      ]
    });

    this.fsm.ondown = () => this.onFsmDown();
    this.fsm.onconnect = () => this.onFsmConnect();
    this.fsm.onenterdown = () => this.onFsmDownEntry();
    this.fsm.onleavedown = () => this.onFsmDownExit();
    this.fsm.ontrying = () => this.onFsmTrying();
    this.fsm.onhalrcmd_up = () => this.onFsmHalrcmdUp();
    this.fsm.ondisconnect = () => this.onFsmDisconnect();
    this.fsm.onbind = () => this.onFsmBind();
    this.fsm.onhalrcomp_bind_msg_sent = () => this.onFsmHalrcompBindMsgSent();
    this.fsm.onno_bind = () => this.onFsmNoBind();
    this.fsm.onbinding = () => this.onFsmBinding();
    this.fsm.onbind_confirmed = () => this.onFsmBindConfirmed();
    this.fsm.onbind_rejected = () => this.onFsmBindRejected();
    this.fsm.onhalrcmd_trying = () => this.onFsmHalrcmdTrying();
    this.fsm.onsyncing = () => this.onFsmSyncing();
    this.fsm.onhalrcomp_up = () => this.onFsmHalrcompUp();
    this.fsm.onsync_failed = () => this.onFsmSyncFailed();
    this.fsm.onsynced = () => this.onFsmSynced();
    this.fsm.onhalrcomp_trying = () => this.onFsmHalrcompTrying();
    this.fsm.onset_rejected = () => this.onFsmSetRejected();
    this.fsm.onhalrcomp_set_msg_sent = () => this.onFsmHalrcompSetMsgSent();
    this.fsm.onentersynced = () => this.onFsmSyncedEntry();
    this.fsm.onerror = () => this.onFsmError();
    this.fsm.onentererror = () => this.onFsmErrorEntry();
  }

  onFsmDown() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state DOWN`);
    }

    this.trigger("stateChanged", "down");
  }

  onFsmConnect() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event CONNECT`);
    }
    this.addPins();
    this.startHalrcmdChannel();
  }

  onFsmDownEntry() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state DOWN entry`);
    }
    this.setDisconnected();
  }

  onFsmDownExit() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state DOWN exit`);
    }
    this.setConnecting();
  }

  onFsmTrying() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state TRYING`);
    }

    this.trigger("stateChanged", "trying");
  }

  onFsmHalrcmdUp() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event HALRCMD UP`);
    }
    this.bindComponent();
  }

  onFsmDisconnect() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event DISCONNECT`);
    }
    this.stopHalrcmdChannel();
    this.stopHalrcompChannel();
    this.removePins();
  }

  onFsmBind() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state BIND`);
    }

    this.trigger("stateChanged", "bind");
  }

  onFsmHalrcompBindMsgSent() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event HALRCOMP BIND MSG SENT`);
    }
  }

  onFsmNoBind() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event NO BIND`);
    }
    this.startHalrcompChannel();
  }

  onFsmBinding() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state BINDING`);
    }

    this.trigger("stateChanged", "binding");
  }

  onFsmBindConfirmed() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event BIND CONFIRMED`);
    }
    this.startHalrcompChannel();
  }

  onFsmBindRejected() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event BIND REJECTED`);
    }
    this.stopHalrcmdChannel();
  }

  onFsmHalrcmdTrying() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event HALRCMD TRYING`);
    }
  }

  onFsmSyncing() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state SYNCING`);
    }

    this.trigger("stateChanged", "syncing");
  }

  onFsmHalrcompUp() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event HALRCOMP UP`);
    }
  }

  onFsmSyncFailed() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event SYNC FAILED`);
    }
    this.stopHalrcompChannel();
    this.stopHalrcmdChannel();
  }

  onFsmSynced() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state SYNCED`);
    }

    this.trigger("stateChanged", "synced");
  }

  onFsmHalrcompTrying() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event HALRCOMP TRYING`);
    }
    this.unsyncPins();
    this.setTimeout();
  }

  onFsmSetRejected() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event SET REJECTED`);
    }
    this.stopHalrcompChannel();
    this.stopHalrcmdChannel();
  }

  onFsmHalrcompSetMsgSent() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event HALRCOMP SET MSG SENT`);
    }
  }

  onFsmSyncedEntry() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state SYNCED entry`);
    }
    this.setConnected();
  }

  onFsmError() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state ERROR`);
    }

    this.trigger("stateChanged", "error");
  }

  onFsmErrorEntry() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state ERROR entry`);
    }
    this.setError();
  }

  bindComponent() {
    console.warn("WARNING: slot bind component unimplemented");
  }

  addPins() {
    console.warn("WARNING: slot add pins unimplemented");
  }

  removePins() {
    console.warn("WARNING: slot remove pins unimplemented");
  }

  unsyncPins() {
    console.warn("WARNING: slot unsync pins unimplemented");
  }

  setConnected() {
    console.warn("WARNING: slot set connected unimplemented");
  }

  setError() {
    console.warn("WARNING: slot set error unimplemented");
  }

  setDisconnected() {
    console.warn("WARNING: slot set disconnected unimplemented");
  }

  setConnecting() {
    console.warn("WARNING: slot set connecting unimplemented");
  }

  setTimeout() {
    console.warn("WARNING: slot set timeout unimplemented");
  }

  noBind() {
    if (this.fsm.current === "bind") {
      this.fsm.no_bind();
    }
  }

  start() {
    if (this.fsm.current === "down") {
      this.fsm.connect();
    }
  }

  stop() {
    if (this.fsm.current === "trying") {
      this.fsm.disconnect();
    }
    if (this.fsm.current === "binding") {
      this.fsm.disconnect();
    }
    if (this.fsm.current === "syncing") {
      this.fsm.disconnect();
    }
    if (this.fsm.current === "synced") {
      this.fsm.disconnect();
    }
    if (this.fsm.current === "error") {
      this.fsm.disconnect();
    }
  }

  addHalrcompTopic(name) {
    this.halrcompChannel.addSocketTopic(name);
  }

  removeHalrcompTopic(name) {
    this.halrcompChannel.removeSocketTopic(name);
  }

  clearHalrcompTopics() {
    this.halrcompChannel.clearSocketTopics();
  }

  startHalrcmdChannel() {
    this.halrcmdChannel.socketUri = this.halrcmdUri;
    this.halrcmdChannel.start();
  }

  stopHalrcmdChannel() {
    this.halrcmdChannel.stop();
  }

  startHalrcompChannel() {
    this.halrcompChannel.socketUri = this.halrcompUri;
    this.halrcompChannel.start();
  }

  stopHalrcompChannel() {
    this.halrcompChannel.stop();
  }

    /** process all messages received on halrcmd */
  _halrcmdMessageReceived(msg) {
    let rx = msg[0];

    // react to halrcomp bind confirm message
    if (rx.type === ContainerType.MT_HALRCOMP_BIND_CONFIRM) {
      if (this.fsm.current === "binding") {
        this.fsm.bind_confirmed();
      }
    }

    // react to halrcomp bind reject message
    if (rx.type === ContainerType.MT_HALRCOMP_BIND_REJECT) {
      // update error string with note
      this.errorString = "";
      for (let i = 0; i < rx.note.length; ++i) {
        this.errorString += rx.note[i];
        this.errorString += "\n";
      }
      if (this.fsm.current === "binding") {
        this.fsm.bind_rejected();
      }
    }

    // react to halrcomp set reject message
    if (rx.type === ContainerType.MT_HALRCOMP_SET_REJECT) {
      // update error string with note
      this.errorString = "";
      for (let i = 0; i < rx.note.length; ++i) {
        this.errorString += rx.note[i];
        this.errorString += "\n";
      }
      if (this.fsm.current === "synced") {
        this.fsm.set_rejected();
      }
    }

    this.trigger("halrcmdMessageReceived", [rx]);
  }

    /** process all messages received on halrcomp */
  _halrcompMessageReceived(msg) {
    const topic = msg[0];
    let rx = msg[1];

    // react to halrcomp full update message
    if (rx.type === ContainerType.MT_HALRCOMP_FULL_UPDATE) {
      this.halrcompFullUpdateReceived([topic, rx]);
    }

    // react to halrcomp incremental update message
    if (rx.type === ContainerType.MT_HALRCOMP_INCREMENTAL_UPDATE) {
      this.halrcompIncrementalUpdateReceived([topic, rx]);
    }

    // react to halrcomp error message
    if (rx.type === ContainerType.MT_HALRCOMP_ERROR) {
      // update error string with note
      this.errorString = "";
      for (let i = 0; i < rx.note.length; ++i) {
        this.errorString += rx.note[i];
        this.errorString += "\n";
      }
      if (this.fsm.current === "syncing") {
        this.fsm.sync_failed();
      }
      this.halrcompErrorReceived([topic, rx]);
    }

    this.trigger("halrcompMessageReceived", [topic, rx]);
  }

  halrcompFullUpdateReceived() { // unused argument msg
    console.log("SLOT halrcomp full update unimplemented");
  }

  halrcompIncrementalUpdateReceived() { // unused argument msg
    console.log("SLOT halrcomp incremental update unimplemented");
  }

  halrcompErrorReceived() { // unused argument msg
    console.log("SLOT halrcomp error unimplemented");
  }

  sendHalrcmdMessage(type, tx) {
    this.halrcmdChannel.sendSocketMessage(type, tx);
    if (type === ContainerType.MT_HALRCOMP_BIND)
    {
      if (this.fsm.current === "bind") {
        this.fsm.halrcomp_bind_msg_sent();
      }
    }
    if (type === ContainerType.MT_HALRCOMP_SET)
    {
      if (this.fsm.current === "synced") {
        this.fsm.halrcomp_set_msg_sent();
      }
    }
  }

  sendHalrcompBind(tx) {
    this.sendHalrcmdMessage(ContainerType.MT_HALRCOMP_BIND, tx);
  }

  sendHalrcompSet(tx) {
    this.sendHalrcmdMessage(ContainerType.MT_HALRCOMP_SET, tx);
  }

  halrcmdChannelStateChanged(state) {

    if (state === "trying") {
      if (this.fsm.current === "syncing") {
        this.fsm.halrcmd_trying();
      }
      if (this.fsm.current === "synced") {
        this.fsm.halrcmd_trying();
      }
      if (this.fsm.current === "binding") {
        this.fsm.halrcmd_trying();
      }
    }

    if (state === "up") {
      if (this.fsm.current === "trying") {
        this.fsm.halrcmd_up();
      }
    }
  }

  halrcompChannelStateChanged(state) {

    if (state === "trying") {
      if (this.fsm.current === "synced") {
        this.fsm.halrcomp_trying();
      }
    }

    if (state === "up") {
      if (this.fsm.current === "syncing") {
        this.fsm.halrcomp_up();
      }
    }
  }
}
MicroEvent.mixin(RemoteComponentBase);
