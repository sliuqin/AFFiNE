[**@blocksuite/block-std**](../../../../@blocksuite/block-std/README.md)

***

[BlockSuite API Documentation](../../../../README.md) / [@blocksuite/block-std](../../README.md) / [index](../README.md) / ConfigExtensionFactory

# Function: ConfigExtensionFactory()

> **ConfigExtensionFactory**\<`Config`\>(`flavor`): (`config`) => `ExtensionType` & `object`

Create a config extension.
A config extension provides a configuration object for a block flavour.
The configuration object can be used like:
```ts
const config = std.provider.get(ConfigIdentifier('my-flavour'));
```

## Type Parameters

### Config

`Config` *extends* `Record`\<`string`, `any`\>

## Parameters

### flavor

`string`

The flavour of the block that the config is for.

## Returns

(`config`) => `ExtensionType` & `object`

## Example

```ts
import { ConfigExtensionFactory } from '@blocksuite/block-std';
const MyConfigExtensionFactory = ConfigExtensionFactory<ConfigType>('my-flavour');
const MyConfigExtension = MyConfigExtensionFactory({
  option1: 'value1',
  option2: 'value2',
});
```
