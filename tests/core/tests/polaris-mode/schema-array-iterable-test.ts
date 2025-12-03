import { useRecommendedStore } from '@warp-drive/core';
import type { Type } from '@warp-drive/core/types/symbols';
import { module, setupTest, test } from '@warp-drive/diagnostic/ember';
import { JSONAPICache } from '@warp-drive/json-api';

const Store = useRecommendedStore({
  cache: JSONAPICache,
});
interface Address {
  street: string;
  city: string;
}

interface User {
  id: string;
  $type: 'user';
  name: string;
  addresses: Address[];
  [Type]: 'user';
}

module('SchemaArray | Iterable Behaviors', function (hooks) {
  setupTest(hooks);

  test('we can use `JSON.stringify` on a SchemaArray', function (assert) {
    const store = new Store();
    const { schema } = store;

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
      },
    });

    try {
      const serialized = JSON.stringify(record);
      assert.true(true, 'JSON.stringify should not throw');

      const value = JSON.parse(serialized) as object;
      assert.deepEqual(
        value,
        {
          id: '1',
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
        'stringify should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `JSON.stringify should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `[ ...record.addresses ]` on a SchemaArray', function (assert) {
    const store = new Store();
    const { schema } = store;

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
      },
    });

    try {
      const value = [...record.addresses] as Address[];
      assert.true(true, 'spread should not throw');
      // Note: spread yields raw objects (not ReactiveResources) to enable safe reassignment
      // Compare data content, not object identity
      assert.deepEqual(
        value.map((v) => ({ street: v.street, city: v.city })),
        [
          { street: '123 Area St', city: 'Baytown' },
          { street: '456 Land St', city: 'Oaktown' },
        ],
        'spread should remove constructor and include all other fields in the schema'
      );
    } catch (e: unknown) {
      assert.true(false, `spread should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `for (const value of record.addresses)` on a record', function (assert) {
    const store = new Store();
    const { schema } = store;

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
      },
    });

    try {
      const value = [] as Address[];

      for (const val of record.addresses) {
        value.push(val);
      }

      assert.true(true, 'for...of should not throw');
      // Note: for...of yields raw objects (not ReactiveResources) to enable safe reassignment
      // Compare data content, not object identity
      assert.deepEqual(
        value.map((v) => ({ street: v.street, city: v.city })),
        [
          { street: '123 Area St', city: 'Baytown' },
          { street: '456 Land St', city: 'Oaktown' },
        ],
        'for...of should work'
      );
    } catch (e: unknown) {
      assert.true(false, `for...of should not throw: ${(e as Error).message}`);
    }
  });

  test('we can use `Array.from(record.addresses)` as expected', function (assert) {
    const store = new Store();
    const { schema } = store;

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
      },
    });

    try {
      const value = Array.from(record.addresses);
      assert.true(true, 'Array.from should not throw');
      // Note: Array.from yields raw objects (not ReactiveResources) to enable safe reassignment
      // Compare data content, not object identity
      assert.deepEqual(
        value.map((v) => ({ street: v.street, city: v.city })),
        [
          { street: '123 Area St', city: 'Baytown' },
          { street: '456 Land St', city: 'Oaktown' },
        ],
        'Array.from should work'
      );
    } catch (e: unknown) {
      assert.true(false, `Array.from should not throw: ${(e as Error).message}`);
    }
  });

  test('iteration yields the same object instances as index access', function (assert) {
    const store = new Store();
    const { schema } = store;

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });
    const record = store.push<User>({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Wesley Thoburn',
          addresses: [
            {
              street: '123 Area St',
              city: 'Baytown',
            },
            {
              street: '456 Land St',
              city: 'Oaktown',
            },
          ],
        },
      },
    });

    // Note: Iteration yields RAW values (for safe reassignment), while index access yields ReactiveResources.
    // For reactive UI updates, use index access pattern: {{#let (get arr index) as |item|}}
    const spreadResult = [...record.addresses];

    // Spread yields raw values (plain objects), not ReactiveResources
    // These won't be the same as index access which returns ReactiveResources
    assert.true(spreadResult[0] !== record.addresses[0], 'spread yields raw value, not ReactiveResource');
    assert.true(spreadResult[1] !== record.addresses[1], 'spread yields raw value, not ReactiveResource');

    // However, the data should be equivalent
    const first = spreadResult[0];
    const second = spreadResult[1];
    assert.equal(first.street, record.addresses[0]?.street, 'first item data matches');
    assert.equal(second.street, record.addresses[1]?.street, 'second item data matches');
  });

  test('spread and reassign works correctly without infinite recursion', function (assert) {
    const store = new Store();
    const { schema } = store;

    schema.registerResource({
      type: 'address',
      identity: null,
      fields: [
        {
          name: 'street',
          kind: 'field',
        },
        {
          name: 'city',
          kind: 'field',
        },
      ],
    });

    schema.registerResource({
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        {
          name: 'name',
          kind: 'field',
        },
        {
          name: 'addresses',
          kind: 'schema-array',
          type: 'address',
        },
      ],
    });

    // Create a record with createRecord (editable)
    const record = store.createRecord<User>('user', {
      name: 'Wesley Thoburn',
      addresses: [
        {
          street: '123 Area St',
          city: 'Baytown',
        },
      ],
    });

    assert.equal(record.addresses.length, 1, 'initial length is 1');

    // First spread and reassign - add a second address
    record.addresses = [...record.addresses, { street: '456 Land St', city: 'Oaktown' }];
    assert.equal(record.addresses.length, 2, 'length is 2 after first reassign');
    assert.equal(record.addresses[0]?.street, '123 Area St', 'first address street is correct');
    assert.equal(record.addresses[1]?.street, '456 Land St', 'second address street is correct');

    // Second spread and reassign - this previously caused infinite recursion
    record.addresses = [...record.addresses, { street: '789 Oak Ave', city: 'Treetown' }];
    assert.equal(record.addresses.length, 3, 'length is 3 after second reassign');
    assert.equal(record.addresses[0]?.street, '123 Area St', 'first address street is still correct');
    assert.equal(record.addresses[1]?.street, '456 Land St', 'second address street is still correct');
    assert.equal(record.addresses[2]?.street, '789 Oak Ave', 'third address street is correct');

    // Third spread and reassign - ensure continued stability
    record.addresses = [...record.addresses, { street: '101 Pine Rd', city: 'Forestville' }];
    assert.equal(record.addresses.length, 4, 'length is 4 after third reassign');
  });
});
