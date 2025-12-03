import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL, peekInternalSignal } from '../../../signals/-private';
import type { ArrayValue } from '../../../types/json/raw';
import type { SchemaArrayField } from '../../../types/schema/fields';
import type { KindContext, ObjectContext } from '../default-mode';
import type { ManagedArray } from '../fields/managed-array.ts';
import { Context, SOURCE } from '../symbols.ts';

export { getArrayField as getSchemaArrayField } from './array-field';

/**
 * Converts a value to raw data suitable for storage in the cache.
 * If the value is a ReactiveResource (embedded schema-object from a schema-array),
 * we extract its raw data to avoid storing proxies in the cache.
 */
function toRawValue(value: unknown, parentArray: ManagedArray | null): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  // Try to access the Context property directly (works through proxy get trap)
  // Using direct access instead of `in` operator because proxies without `has` trap
  // may not correctly respond to `in` checks
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (value as any)[Context] as ObjectContext | undefined;
    if (ctx && typeof ctx === 'object' && ctx.path !== null && ctx.path.length > 0 && parentArray) {
      // This is a ReactiveResource - extract raw data from parent's SOURCE
      const index = ctx.path[ctx.path.length - 1];
      const numIndex = typeof index === 'number' ? index : parseInt(String(index), 10);

      if (!isNaN(numIndex)) {
        // Access the raw source array directly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sourceArray = (parentArray as any)[SOURCE] as unknown[] | undefined;
        if (sourceArray && numIndex >= 0 && numIndex < sourceArray.length) {
          return sourceArray[numIndex];
        }
      }
    }
  } catch {
    // Not a ReactiveResource or access failed - return as-is
  }

  return value;
}

export function setSchemaArrayField(context: KindContext<SchemaArrayField>): boolean {
  const fieldSignal = peekInternalSignal(context.signals, context.path.at(-1)!);
  const peeked = fieldSignal?.value as ManagedArray | undefined | null;

  let arrayValue: ArrayValue | null = null;

  if (context.value !== null && Array.isArray(context.value)) {
    // Convert any ReactiveResource instances back to raw data
    // This handles the case where the user spreads a schema-array
    // (e.g., [...myArray, newItem]) which yields ReactiveResources,
    // then assigns the result back to the field
    arrayValue = (context.value as unknown[]).map((item) => toRawValue(item, peeked ?? null)) as ArrayValue;
  }

  context.store.cache.setAttr(context.resourceKey, context.path, arrayValue);
  if (peeked) {
    assert(`Expected the peekManagedArray for ${context.field.kind} to return a ManagedArray`, ARRAY_SIGNAL in peeked);
    const arrSignal = peeked[ARRAY_SIGNAL];
    arrSignal.isStale = true;

    if (!Array.isArray(arrayValue)) {
      fieldSignal!.value = null;
    }
  }

  return true;
}
