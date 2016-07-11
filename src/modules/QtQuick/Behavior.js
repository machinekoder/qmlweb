registerQmlType({
  module: 'QtQuick',
  name:   'Behavior',
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    animation: "Animation",
    enabled: { type: "bool", initialValue: true }
  },
  defaultProperty: "animation"
}, class {
  constructor(meta) {
    callSuper(this, meta);
  }
  onAnimationChanged(newVal) {
    newVal.target = this.$parent;
    newVal.property = meta.object.$on;
    this.$parent.$properties[meta.object.$on].animation = newVal;
  }
  onEnabledChanged(newVal) {
    this.$parent.$properties[meta.object.$on].animation = newVal
      ? this.animation
      : null;
  }
});
