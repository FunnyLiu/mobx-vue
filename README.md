
# 源码分析

## 文件结构

``` bash
/Users/liufang/openSource/FunnyLiu/mobx-vue
├── src
|  ├── collectData.ts - 收据vue组件的数据
|  ├── index.ts - 直接暴露observer.ts中所有
|  ├── observer.ts - 提供包装函数observer

```

## 外部模块依赖

请在： http://npm.broofa.com?q=mobx-vue 查看

## 内部模块依赖

![img](./inner.svg)

## 逐行文件分析

### observer.ts

提供包装函数observer。

首先提取传入的vue组件的数据，通过collectData.ts。

然后手动创建组件继承自vue。

覆盖其生命周期$mount阶段和$destroy阶段。

在$mount阶段初次，通过mobx的reaction来建立响应式追踪，第二次数据变化就不再重新$mount，而是直接调用this.__watcher.getter，重新渲染组件。

而$destroy阶段，则是代理执行vue的$destroy，并调用mobx的reaction.getDisposer()来回收。

### collectData.ts

收据vue组件的数据。

通过mobx的isObservable来判断是否响应式，如果不是则手动通过Object.defineProperty增加响应式。

# mobx-vue

[![npm version](https://img.shields.io/npm/v/mobx-vue.svg?style=flat-square)](https://www.npmjs.com/package/mobx-vue)
[![coverage](https://img.shields.io/codecov/c/github/mobxjs/mobx-vue.svg?style=flat-square)](https://codecov.io/gh/mobxjs/mobx-vue)
[![npm downloads](https://img.shields.io/npm/dt/mobx-vue.svg?style=flat-square)](https://www.npmjs.com/package/mobx-vue)
[![Build Status](https://img.shields.io/travis/mobxjs/mobx-vue.svg?style=flat-square)](https://travis-ci.org/mobxjs/mobx-vue)

Vue bindings for MobX, inspired by [mobx-react](https://github.com/mobxjs/mobx-react)

![logo](https://github.com/mobxjs/mobx-vue/blob/master/logo.png?raw=true)

## Installation

```bash
npm i mobx-vue -S
```

or

```bash
yarn add mobx-vue
```

## Requirement
* Vue >= 2.0.0
* MobX >= 2.0.0, compatible with MobX 5!

## Why mobx-vue 

MobX is an unopinionated, scalable state management, which can make our programming more intuitive.

Unlike the other vue-rx-inspired libraries which based on the plugin mechanism of vue, mobx-vue will be the simplest you ever meet. What you all need is to bind your state in component definition and observe it just like [mobx-react](https://github.com/mobxjs/mobx-react) does,  then your component will react to your state changes automatically which managed by mobx.

And, the most important is that you can build a view-library-free application, if you wanna migrate to another view library(React/Angular) someday, rewrite the template and switch to the relevant mobx bindings([mobx-react](https://github.com/mobxjs/mobx-react),[mobx-angular](https://github.com/mobxjs/mobx-angular),[mobx-angularjs](https://github.com/mobxjs/mobx-angularjs)) is all you have to do.

### Articles: 

* [Build A View-Framework-Free Data Layer Based on MobX — Integration With Vue](https://medium.com/@kuitos/build-a-view-framework-free-data-layer-based-on-mobx-integration-with-vue-1-8b524b86c7b8)

* [Why MobX + movue, instead of Vuex?](https://github.com/nighca/movue/issues/8)
* [基于 MobX 构建视图框架无关的数据层-与 Vue 的结合(1)](https://zhuanlan.zhihu.com/p/37736470)

## Usage

We highly recommend using the bindings with [vue-class-component](https://github.com/vuejs/vue-class-component) decorator, and define the Store/ViewModel independently.

```ts
import { action, computed, observable } from "mobx";
export default class ViewModel {
    @observable age = 10;
    @observable users = [];

    @computed get computedAge() {
        return this.age + 1;
    }

    @action.bound setAge() {
        this.age++;
    }
    
    @action.bound async fetchUsers() {
    	this.users = await http.get('/users')
    }
}
```

```vue
<template>
    <section>
        <p v-text="state.age"></p>
        <p v-text="state.computedAge"></p>
        <p v-for="user in state.users" :key="user.name">{{user.name}}</p>
        <button @click="state.setAge"></button>
    </section>
</template>

<script lang="ts">
    import Vue from "vue";
    import Component from "vue-class-component";
    import { Observer } from "mobx-vue";
    import ViewModel from "./ViewModel";

    @Observer
    @Component
    export default class App extends Vue {
        state = new ViewModel()
        mounted() { 
            this.state.fetchUsers();
        }
    }
</script>
```

Or used with the traditional way:

```vue
<script lang="ts">
    import { observer } from "mobx-vue";
    import ViewModel from "./ViewModel";

    export default observer({
        data() {
            return { state: new ViewModel() }
        },
        mounted() {
            this.state.fetchUsers() 
        }
    })
</script>
```

All you need is to bind your state to component and observe it. No more reactive data definitions in component.

*Tips: If you're tired of instantiating instance manually every time, you might wanna try the [mmlpx](https://github.com/mmlpxjs/mmlpx) library which leveraged a dependency injection system.*

## API

* observer((VueComponent | options): ExtendedVueComponent
