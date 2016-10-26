// const Container = machinetalk.protobuf.message.Container;
// const ContainerType = machinetalk.protobuf.message.ContainerType;

class HalrcompSubscribe {
  constructor(debugname, debuglevel) {
    this.debuglevel = typeof debuglevel !== "undefined" ? debuglevel : 0;
    this.debugname = typeof debugname !== "undefined" ? debugname : 0;
    this.errorString = "";
    this._uuid = this._getUuid();
    this.socket = null;

    // Socket
    this.socketUri = "";
    this.socketTopics = [];

    // Heartbeat
    this.heartbeatInterval = 0;
    this.heartbeatTimer = null;
    this.heartbeatActive = false;
    this.heartbeatLiveness = 0;
    this.heartbeatResetLiveness = 2;

    // fsm
    this.fsm = StateMachine.create({
      initial: "down",
      events: [
      { name: "connect", from: "down", to: "trying" },
      { name: "connected", from: "trying", to: "up" },
      { name: "disconnect", from: "trying", to: "down" },
      { name: "timeout", from: "up", to: "trying" },
      { name: "tick", from: "up", to: "up" },
      { name: "message_received", from: "up", to: "up" },
      { name: "disconnect", from: "up", to: "down" },
      ]
    });

    this.fsm.ondown = () => this.onFsmDown();
    this.fsm.onconnect = () => this.onFsmConnect();
    this.fsm.ontrying = () => this.onFsmTrying();
    this.fsm.onconnected = () => this.onFsmConnected();
    this.fsm.ondisconnect = () => this.onFsmDisconnect();
    this.fsm.onup = () => this.onFsmUp();
    this.fsm.ontimeout = () => this.onFsmTimeout();
    this.fsm.ontick = () => this.onFsmTick();
    this.fsm.onmessage_received = () => this.onFsmMessageReceived();
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
    this.startSocket();
  }

  onFsmTrying() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state TRYING`);
    }

    this.trigger("stateChanged", "trying");
  }

  onFsmConnected() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event CONNECTED`);
    }
    this.resetHeartbeatLiveness();
    this.startHeartbeatTimer();
  }

  onFsmDisconnect() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event DISCONNECT`);
    }
    this.stopHeartbeatTimer();
    this.stopSocket();
  }

  onFsmUp() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state UP`);
    }

    this.trigger("stateChanged", "up");
  }

  onFsmTimeout() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event TIMEOUT`);
    }
    this.stopHeartbeatTimer();
    this.stopSocket();
    this.startSocket();
  }

  onFsmTick() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event TICK`);
    }
    this.resetHeartbeatTimer();
  }

  onFsmMessageReceived() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event MESSAGE RECEIVED`);
    }
    this.resetHeartbeatLiveness();
    this.resetHeartbeatTimer();
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
    if (this.fsm.current === "up") {
      this.fsm.disconnect();
    }
  }

  addSocketTopic(name) {
    this.socketTopics.push(name);
  }

  removeSocketTopic(name) {
    this.socketTopics.pop(name);
  }

  clearSocketTopics() {
    this.socketTopics = [];
  }

  startSocket() {
    this.socket = io({ forceNew: true });
    this.socket.send({ type: "connect socket",
                       data: { uri: this.socketUri,
                               type: "sub", uuid: this._uuid }
                     });
    this.socket.on("message", msg => this._socketMessageReceived(msg));

    for (let i = 0; i < this.socketTopics.length; ++i) {
      this.socket.emit("subscribe", this.socketTopics[i]);
    }
  }

  stopSocket() {
    if (this.socket !== null) {
      this.socket.close();
      this.socket = null;
    }
  }

  heartbeatTimerTick() {
    this.heartbeatTimer = null; // timer is dead on tick

    if (this.debuglevel > 0) {
      console.log(`${this.debugname} timer tick`);
    }

    this.heartbeatLiveness -= 1;
    if (this.heartbeatLiveness === 0) {
      if (this.fsm.current === "up") {
        this.fsm.timeout();
      }
      return;
    }
    if (this.fsm.current === "up") {
      this.fsm.tick();
    }
  }

  resetHeartbeatLiveness() {
    this.heartbeatLiveness = this.heartbeatResetLiveness;
  }

  resetHeartbeatTimer() {
    if (!this.heartbeatActive) {
      return;
    }

    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.heartbeatInterval > 0) {
      this.heartbeatTimer = setTimeout(
        () => this.heartbeatTimerTick(),
        this.heartbeatInterval);
    }

    if (this.debuglevel > 0) {
      console.log(`${this.debugname} timer reset`);
    }
  }

  startHeartbeatTimer() {
    this.heartbeatActive = true;
    this.resetHeartbeatTimer();
  }

  stopHeartbeatTimer() {
    this.heartbeatActive = false;
    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

    /** process all messages received on socket */
  _socketMessageReceived(msg) {
    const topic = msg[0];
    let rx = msg[1];
    rx = Container.decode(rx);
    if (this.debuglevel > 0) {
      console.log(`${this.debugname} received message`);
      if (this.debuglevel > 1) {
        console.log(rx);
      }
    }

    // react to any incoming message
    if (this.fsm.current === "up") {
      this.fsm.message_received();
    }

    // react to ping message
    if (rx.type === ContainerType.MT_PING) {
      return; // ping is uninteresting
    }

    // react to halrcomp full update message
    if (rx.type === ContainerType.MT_HALRCOMP_FULL_UPDATE) {
      if (rx.pparams !== null) {
        interval = rx.pparams.keepalive_timer;
        this.heartbeatInterval = interval;
      }
      if (this.fsm.current === "trying") {
        this.fsm.connected();
      }
    }

    this.trigger("socketMessageReceived", [topic, rx]);
  }
  _getUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0;
      const v = c === "x" ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }
}
MicroEvent.mixin(HalrcompSubscribe);
