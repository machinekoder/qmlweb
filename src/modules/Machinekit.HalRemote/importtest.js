/*
class RpcClient {
  constructor(debugName, debugLevel) {
    this.debugName = debugName;
    this.bind('test', (args) => { this._foo.apply(this, arguments); });
    this.trigger('test', 'foo', 'bar');
  }

  _foo (foo, bar) {
    console.log(`class ${this.debugName}`);
    console.log(foo + bar);
  }
};
MicroEvent.mixin(RpcClient);
*/
