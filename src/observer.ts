/**
 * @author Kuitos
 * @homepage https://github.com/kuitos/
 * @since 2018-05-22 16:39
 */
import { Reaction } from 'mobx';
import Vue, { ComponentOptions } from 'vue';
import collectDataForVue from './collectData';

export type VueClass<V> = (new(...args: any[]) => V & Vue) & typeof Vue;

// @formatter:off
// tslint:disable-next-line
const noop = () => {};
const disposerSymbol = Symbol('disposerSymbol');
// @formatter:on
// 包装函数
function observer<VC extends VueClass<Vue>>(Component: VC | ComponentOptions<Vue>): VC;
function observer<VC extends VueClass<Vue>>(Component: VC | ComponentOptions<Vue>) {

	const name = (Component as any).name || (Component as any)._componentTag || (Component.constructor && Component.constructor.name) || '<component>';

	const originalOptions = typeof Component === 'object' ? Component : (Component as any).options;
	// To not mutate the original component options, we need to construct a new one
	// 取出数据定义
	const dataDefinition = originalOptions.data;
	const options = {
		...originalOptions,
		name,
		data(vm: Vue) {
			// 从vue组件中收集其data
			return collectDataForVue(vm || this, dataDefinition);
		},
		// overrider the cached constructor to avoid extending skip
		// @see https://github.com/vuejs/vue/blob/6cc070063bd211229dff5108c99f7d11b6778550/src/core/global-api/extend.js#L24
		_Ctor: {},
	};

	// we couldn't use the Component as super class when Component was a VueClass, that will invoke the lifecycle twice after we called Component.extend
	// 手动继承组件，将组装的内容传入
	const superProto = typeof Component === 'function' && Object.getPrototypeOf(Component.prototype);
	const Super = superProto instanceof Vue ? superProto.constructor : Vue;
	const ExtendedComponent = Super.extend(options);
    
	const { $mount, $destroy } = ExtendedComponent.prototype;
	// 重写生命周期之mount
	ExtendedComponent.prototype.$mount = function (this: any, ...args: any[]) {

		let mounted = false;
		this[disposerSymbol] = noop;

		let nativeRenderOfVue: any;
		const reactiveRender = () => {
			reaction.track(() => {
				// 如果组件第一次渲染
				if (!mounted) {
					// 执行mount
					$mount.apply(this, args);
					mounted = true;
					nativeRenderOfVue = this._watcher.getter;
					// rewrite the native render method of vue with our reactive tracker render
					// thus if component updated by vue watcher, we could re track and collect dependencies by mobx
					this._watcher.getter = reactiveRender;
				} else {
					// 后面直接调用this._watcher.getter，而不再重新执行$mount了
					nativeRenderOfVue.call(this, this);
				}
			});

			return this;
		};

		const reaction = new Reaction(`${name}.render()`, reactiveRender);
		//挂载getDisposer，用来销毁时回收内存占用
		this[disposerSymbol] = reaction.getDisposer();
		// 将生命周期的$mount和mobx的reaction.track()绑定,
		// 从而达到可观察数据变化后，组件渲染
		return reactiveRender();
	};
    // 重写生命周期之destroy
	ExtendedComponent.prototype.$destroy = function (this: Vue) {
		// 调用mount时挂载的gettDisposer，来销毁reaction。
		(this as any)[disposerSymbol]();
		// 代理destroy执行
		$destroy.apply(this);
	};
	
	const extendedComponentNamePropertyDescriptor = Object.getOwnPropertyDescriptor(ExtendedComponent, 'name') || {};
	if (extendedComponentNamePropertyDescriptor.configurable === true) {
		Object.defineProperty(ExtendedComponent, 'name', {
			writable: false,
			value: name,
			enumerable: false,
			configurable: false,
		});
	}

	return ExtendedComponent;
}

export {
	observer,
	observer as Observer,
};
