[**@blocksuite/block-std**](../../../../@blocksuite/block-std/README.md)

***

[BlockSuite API Documentation](../../../../README.md) / [@blocksuite/block-std](../../README.md) / [index](../README.md) / RangeManager

# Class: RangeManager

CRUD for Range and TextSelection

## Extends

- [`LifeCycleWatcher`](LifeCycleWatcher.md)

## Methods

### created()

> **created**(): `void`

Called when std is created.

#### Returns

`void`

#### Inherited from

[`LifeCycleWatcher`](LifeCycleWatcher.md).[`created`](LifeCycleWatcher.md#created)

***

### getSelectedBlockComponentsByRange()

> **getSelectedBlockComponentsByRange**(`range`, `options`): `BlockComponent`\<`BlockModel`\<`object`\>, [`BlockService`](BlockService.md), `string`\>[]

#### Parameters

##### range

`Range`

##### options

###### match?

(`el`) => `boolean`

###### mode?

`"flat"` \| `"all"` \| `"highest"`

#### Returns

`BlockComponent`\<`BlockModel`\<`object`\>, [`BlockService`](BlockService.md), `string`\>[]

#### Example

```ts
aaa
  b[bb
    ccc
ddd
  ee]e

all mode: [aaa, bbb, ccc, ddd, eee]
flat mode: [bbb, ccc, ddd, eee]
highest mode: [bbb, ddd]

match function will be evaluated before filtering using mode
```

***

### mounted()

> **mounted**(): `void`

Called when editor host is mounted.
Which means the editor host emit the `connectedCallback` lifecycle event.

#### Returns

`void`

#### Overrides

[`LifeCycleWatcher`](LifeCycleWatcher.md).[`mounted`](LifeCycleWatcher.md#mounted)

***

### rendered()

> **rendered**(): `void`

Called when `std.render` is called.

#### Returns

`void`

#### Inherited from

[`LifeCycleWatcher`](LifeCycleWatcher.md).[`rendered`](LifeCycleWatcher.md#rendered)

***

### unmounted()

> **unmounted**(): `void`

Called when editor host is unmounted.
Which means the editor host emit the `disconnectedCallback` lifecycle event.

#### Returns

`void`

#### Inherited from

[`LifeCycleWatcher`](LifeCycleWatcher.md).[`unmounted`](LifeCycleWatcher.md#unmounted)
