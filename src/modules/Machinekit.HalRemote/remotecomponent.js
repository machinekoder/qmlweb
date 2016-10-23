class RemoteComponent extends RemoteComponentBase {
  constructor(debugname, debuglevel) {
    super(debugname, debuglevel);
    this.debugname = debugname;
    this.debuglevel = debuglevel;

    this.pinsByName = {};
    this.pinsByHandle = {};
    this.pins = [];
    this.connected = false;
  }

  setPins(pins) {
    this.pins = pins;
    this.pinsByName = {};
    for (let i = 0; i < pins.length; ++i) {
      let pin = pins[i];
      this.pinsByName[pin.name] = pin;
      pin.valueUpdated.connect(this, this.pinChange);
    }
  }

  bindComponent() {
    this.noBind();
  }

  addPins() {
    this.trigger("addPins");
  }

  removePins() {
    // need to destroy pins here
    this.pins = [];
    this.pinsByName = {};
    this.pinsByHandle = {};
    this.trigger("removePins");
  }

  unsyncPins() {
    for (pin of this.keys) {
      pin.synced = false;
    }
  }

  setConnected() {
    this.trigger("setConnected");
    this.connected = true;
  }

  setError() {
    this.trigger("setError");
    this.connected = false;
  }

  setDisconnected() {
    this.trigger("setDisconnected");
    this.connected = false;
  }

  setConnecting() {
    this.trigger("setConnecting");
    this.connected = false;
  }

  setTimeout() {
    this.trigger("setTimeout");
    this.connected = false;
  }

  pinChange(pin, value) {
    if (!this.connected) {
      return;
    }

    if (pin.direction == HalPinDirection.HAL_IN) {
      return; // update only Output or IO pins
    }

    // This message MUST carry a Pin message for each pin which has
    // changed value since the last message of this type.
    // Each Pin message MUST carry the handle field.
    // Each Pin message MAY carry the name field.
    // Each Pin message MUST carry the type field
    // Each Pin message MUST - depending on pin type - carry a halbit,
    // halfloat, hals32, or halu32 field.
    let halPin = new HalPin();
    halPin.handle = pin.handle;
    halPin.type = pin.type;
    if (pin.type == HalPinType.HAL_FLOAT) {
      halPin.halfloat = pin.value;
    }
    else if (pin.type == HalPinType.HAL_BIT) {
      halPin.halbit = pin.value;
    }
    else if (pin.type == HalPinType.HAL_S32) {
      halPin.hals32 = pin.value;
    }
    else if (pin.type == HalPinType.HAL_U32) {
      halPin.halu32 = pin.value;
    }
    else {
      console.debug("wrong pin type");
      return;
    }
    this.halrcmdTx.pin.push(halPin);
    this.sendHalrcmdMessage(ContainerType.MT_HALRCOMP_SET, this.halrcmdTx);
  }

  pinUpdate(rpin, lpin) {
    if (rpin.halfloat !== null) {
        lpin.setValue(rpin.halfloat, true);
    }
    else if (rpin.halbit !== null) {
        lpin.setValue(rpin.halbit, true);
    }
    else if (rpin.hals32 !== null) {
        lpin.setValue(rpin.hals32, true);
    }
    else if (rpin.halu32 !== null) {
        lpin.setValue(rpin.halu32, true);
    }
  }

  halrcompFullUpdateReceived(msg) {
    const topic = msg[0];
    const rx = msg[1];

    let comp = rx.comp[0];
    for (let i = 0; i < comp.pin.length; ++i) {
        let rpin = comp.pin[i];
      let name = rpin.name.split(".")[1];
      let lpin = this.pinsByName[name];
      if (lpin === undefined) {  // new pin
        lpin = {type: rpin.type,
                direction: rpin.dir,
                synced: false,
                parent: this};
        this.pinsByName[name] = lpin;
      }
      lpin.handle = rpin.handle;
      this.pinsByHandle[rpin.handle] = lpin; // create reference
      this.pinUpdate(rpin, lpin);
    }
  }

  halrcompIncrementalUpdateReceived(msg) {
    const topic = msg[0];
    const rx = msg[1];

    for (let i = 0; i < rx.pin.length; ++i) {
      let rpin = rx.pin[i];
      this.pinUpdate(rpin, this.pinsByHandle[rpin.handle]);
    }
  }

  halrcompErrorReceived(msg) {
    console.log("received an error");
  }
}
