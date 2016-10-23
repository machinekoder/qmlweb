QmlWeb.registerQmlType({
  module: "Machinekit.HalRemote",
  name: "HalPin",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  enums: {
    HalPin: {
      Bit: HalPinType.HAL_BIT,
      Float: HalPinType.HAL_FLOAT,
      S32: HalPinType.HAL_S32,
      U32: HalPinType.HAL_U32,
      In: HalPinDirection.HAL_IN,
      Out: HalPinDirection.HAL_OUT,
      IO: HalPinDirection.HAL_IO
    }
  },
  properties: {
    name: { type: "string", initialValue: "default" },
    type: { type: "enum", initialValue: HalPinType.HAL_BIT },
    direction: { type: "enum", initialValue: HalPinDirection.HAL_OUT },
    value: { type: "var", initialValue: false },
    handle: { type: "int", initialValue: 0 },
    enabled: { type: "bool", initialValue: true },
    synced: { type: "bool", initialValue: false }
  },
  signals: {
    valueUpdated: [{ type: "variant", name: "value" }, { type: "variant", name: "pin" }]
  }

}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);

    this.$syncValue = false;
    this.$valueUpdating = false;

    this.valueChanged.connect(this, this.$onValueChanged);
  }

  setValue(value, synced) {
    this.$valueUpdating = true;
    if (this.value !== value) {
      this.value = value;
    }

    if (synced == true) {
      this.$syncValue = value; // save the sync point
    }
    else if (value === this.$syncValue) {
      synced = true; // if value is same as sync point, synced is always true
    }

    if (this.synced !== synced) {
      this.synced = synced;
    }
    this.$valueUpdating = false;
  }

  $onValueChanged(value) {
    if (!this.$valueUpdating) {
      this.setValue(value, false);
      this.valueUpdated(this, value);
    }
  }
});
