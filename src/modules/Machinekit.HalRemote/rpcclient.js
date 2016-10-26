// const Container = machinetalk.protobuf.message.Container;
// const ContainerType = machinetalk.protobuf.message.ContainerType;

class RPCClient {
  constructor(debugname, debuglevel) {
    this.debuglevel = typeof debuglevel !== "undefined" ? debuglevel : 0;
    this.debugname = typeof debugname !== "undefined" ? debugname : 0;
    this.errorString = "";
    this._uuid = this._getUuid();
    this.socket = null;

    // Socket
    this.socketUri = "";

    // Heartbeat
    this.heartbeatInterval = 2500;
    this.heartbeatTimer = null;
    this.heartbeatActive = false;
    this.heartbeatLiveness = 0;
    this.heartbeatResetLiveness = 2;

    // fsm
    this.fsm = StateMachine.create({
      initial: "down",
      events: [
      { name: "start", from: "down", to: "trying" },
      { name: "any_msg_received", from: "trying", to: "up" },
      { name: "heartbeat_timeout", from: "trying", to: "trying" },
      { name: "heartbeat_tick", from: "trying", to: "trying" },
      { name: "any_msg_sent", from: "trying", to: "trying" },
      { name: "stop", from: "trying", to: "down" },
      { name: "heartbeat_timeout", from: "up", to: "trying" },
      { name: "heartbeat_tick", from: "up", to: "up" },
      { name: "any_msg_received", from: "up", to: "up" },
      { name: "any_msg_sent", from: "up", to: "up" },
      { name: "stop", from: "up", to: "down" },
      ]
    });

    this.fsm.ondown = () => this.onFsmDown();
    this.fsm.onstart = () => this.onFsmStart();
    this.fsm.ontrying = () => this.onFsmTrying();
    this.fsm.onany_msg_received = () => this.onFsmAnyMsgReceived();
    this.fsm.onheartbeat_timeout = () => this.onFsmHeartbeatTimeout();
    this.fsm.onheartbeat_tick = () => this.onFsmHeartbeatTick();
    this.fsm.onany_msg_sent = () => this.onFsmAnyMsgSent();
    this.fsm.onstop = () => this.onFsmStop();
    this.fsm.onup = () => this.onFsmUp();
  }

  onFsmDown() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state DOWN`);
    }

    this.trigger("stateChanged", "down");
  }

  onFsmStart() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event START`);
    }
    this.startSocket();
    this.resetHeartbeatLiveness();
    this.sendPing();
    this.startHeartbeatTimer();
  }

  onFsmTrying() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: state TRYING`);
    }

    this.trigger("stateChanged", "trying");
  }

  onFsmAnyMsgReceived() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event ANY MSG RECEIVED`);
    }
    this.resetHeartbeatLiveness();
    this.resetHeartbeatTimer();
  }

  onFsmHeartbeatTimeout() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event HEARTBEAT TIMEOUT`);
    }
    this.stopSocket();
    this.startSocket();
    this.resetHeartbeatLiveness();
    this.sendPing();
  }

  onFsmHeartbeatTick() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event HEARTBEAT TICK`);
    }
    this.sendPing();
  }

  onFsmAnyMsgSent() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event ANY MSG SENT`);
    }
    this.resetHeartbeatTimer();
  }

  onFsmStop() { // unused params: event, from, to
    if (this.debuglevel > 0) {
      console.log(`${this.debugname}: event STOP`);
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

  start() {
    if (this.fsm.current === "down") {
      this.fsm.start();
    }
  }

  stop() {
    if (this.fsm.current === "trying") {
      this.fsm.stop();
    }
    if (this.fsm.current === "up") {
      this.fsm.stop();
    }
  }

  startSocket() {
    this.socket = io({ forceNew: true });
    this.socket.send({ type: "connect socket",
                       data: { uri: this.socketUri,
                               type: "dealer", uuid: this._uuid }
                     });
    this.socket.on("message", msg => this._socketMessageReceived(msg));
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
        this.fsm.heartbeat_timeout();
      }
      if (this.fsm.current === "trying") {
        this.fsm.heartbeat_timeout();
      }
      return;
    }
    if (this.fsm.current === "up") {
      this.fsm.heartbeat_tick();
    }
    if (this.fsm.current === "trying") {
      this.fsm.heartbeat_tick();
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
    let rx = msg[0];
    rx = Container.decode(rx);
    if (this.debuglevel > 0) {
      console.log(`${this.debugname} received message`);
      if (this.debuglevel > 1) {
        console.log(rx);
      }
    }

    // react to any incoming message
    if (this.fsm.current === "trying") {
      this.fsm.any_msg_received();
    }
    if (this.fsm.current === "up") {
      this.fsm.any_msg_received();
    }

    // react to ping acknowledge message
    if (rx.type === ContainerType.MT_PING_ACKNOWLEDGE) {
      return; // ping acknowledge is uninteresting
    }

    this.trigger("socketMessageReceived", [rx]);
  }

  sendSocketMessage(type, tx) {
    tx.type = type;
    if (this.debuglevel > 0) {
      console.log(`${this.debugname} sending message: ${type}`);
      if (this.debuglevel > 1) {
        console.log(tx);
      }
    }

    const encoded = Container.encode(tx);
    const sendBuffer = encoded.toArrayBuffer();
    this.socket.emit("message", sendBuffer);
    if (this.fsm.current === "up") {
      this.fsm.any_msg_sent();
    }
    if (this.fsm.current === "trying") {
      this.fsm.any_msg_sent();
    }
  }

  sendPing() {
    const tx = new Container();
    this.sendSocketMessage(ContainerType.MT_PING, tx);
  }
  _getUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0;
      const v = c === "x" ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }
}
MicroEvent.mixin(RPCClient);
