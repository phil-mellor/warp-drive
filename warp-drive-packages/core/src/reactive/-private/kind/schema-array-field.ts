import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL, peekInternalSignal } from '../../../signals/-private';
import type { Cache } from '../../../types/cache';
import type { ArrayValue, ObjectValue } from '../../../types/json/raw';
import type { SchemaArrayField } from '../../../types/schema/fields';
import type { KindContext, ObjectContext } from '../default-mode';
import type { ManagedArray } from '../fields/managed-array.ts';
import { Context, SOURCE } from '../symbols.ts';

export { getArrayField as getSchemaArrayField } from './array-field';

/**
 * Recursively converts a value to raw data suitable for storage in the cache.
 * Handles:
 * - ReactiveResource proxies (from schema-objects and schema-array items)
 * - ManagedArray proxies (from schema-arrays and arrays)
 * - Plain objects that may contain nested proxies (e.g., from spreading a ReactiveResource)
 * - Plain arrays that may contain nested proxies
 *
 * This is necessary because when users spread schema-array items (e.g., `{ ...question }`),
 * nested schema-object fields return ReactiveResource instances rather than raw data.
 * Without recursive conversion, these proxies end up in the cache and cause
 * structuredClone errors during serialization.
 */
export function toRawValue(value: unknown, cache: Cache, parentArray: ManagedArray | null): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  // Check if the value itself is a ReactiveResource proxy
  const reactiveCtx = getReactiveContext(value);
  if (reactiveCtx) {
    // First try to get raw data from parent array's SOURCE (most efficient)
    if (parentArray) {
      const index = reactiveCtx.path[reactiveCtx.path.length - 1];
      const numIndex = typeof index === 'number' ? index : parseInt(String(index), 10);

      if (!isNaN(numIndex)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sourceArray = (parentArray as any)[SOURCE] as unknown[] | undefined;
        if (sourceArray && numIndex >= 0 && numIndex < sourceArray.length) {
          return sourceArray[numIndex];
        }
      }
    }

    // Fall back to cache lookup
    const rawData = cache.getAttr(reactiveCtx.resourceKey, reactiveCtx.path);
    if (rawData !== undefined) {
      return rawData;
    }

    // If we can't get raw data, return as-is (shouldn't happen normally)
    return value;
  }

  // Check if the value is a ManagedArray proxy
  const managedSource = getManagedArraySource(value);
  if (managedSource) {
    // Recursively convert items in the managed array
    return managedSource.map((item) => toRawValue(item, cache, null));
  }

  // Handle plain arrays - they may contain ReactiveResource items
  if (Array.isArray(value)) {
    return value.map((item) => toRawValue(item, cache, null));
  }

  // Handle plain objects - they may have ReactiveResource properties
  // This handles the case where user spreads a ReactiveResource: { ...question }
  // The spread creates a plain object but nested schema-object fields are still proxies
  const result: ObjectValue = {};
  let hasProxyProperty = false;

  for (const key of Object.keys(value)) {
    const propValue = (value as ObjectValue)[key];
    const convertedValue = toRawValue(propValue, cache, null);

    // Track if any property needed conversion
    if (convertedValue !== propValue) {
      hasProxyProperty = true;
    }

    result[key] = convertedValue;
  }

  // Only return the new object if we actually converted something
  // This avoids unnecessary object creation for plain data
  return hasProxyProperty ? result : value;
}

export function setSchemaArrayField(context: KindContext<SchemaArrayField>): boolean {
  const fieldSignal = peekInternalSignal(context.signals, context.path.at(-1)!);
  const peeked = fieldSignal?.value as ManagedArray | undefined | null;
  const cache = context.store.cache;

  let arrayValue: ArrayValue | null = null;

  if (context.value !== null && Array.isArray(context.value)) {
    // Convert any ReactiveResource instances back to raw data
    // This handles the case where the user spreads a schema-array
    // (e.g., [...myArray, newItem]) which yields ReactiveResources,
    // then assigns the result back to the field.
    // The recursive toRawValue also handles nested schema-object fields
    // within spread items that would otherwise leak ReactiveResource proxies.
    arrayValue = (context.value as unknown[]).map((item) => toRawValue(item, cache, peeked ?? null)) as ArrayValue;
  }

  cache.setAttr(context.resourceKey, context.path, arrayValue);
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

/**
 * Checks if a value is a ReactiveResource proxy by looking for its Context symbol.
 * Returns the context if found, undefined otherwise.
 */
function getReactiveContext(value: unknown): ObjectContext | undefined {
  if (value === null || value === undefined || typeof value !== 'object') {
    return undefined;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (value as any)[Context] as ObjectContext | undefined;
    if (ctx && typeof ctx === 'object' && ctx.path !== null && ctx.path.length > 0) {
      return ctx;
    }
  } catch {
    // Not a ReactiveResource
  }
  return undefined;
}

/**
 * Checks if a value is a ManagedArray proxy by looking for its SOURCE symbol.
 * Returns the source array if found, undefined otherwise.
 */
function getManagedArraySource(value: unknown): unknown[] | undefined {
  if (value === null || value === undefined || typeof value !== 'object' || !Array.isArray(value)) {
    return undefined;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const source = (value as any)[SOURCE] as unknown[] | undefined;
    if (source && Array.isArray(source)) {
      return source;
    }
  } catch {
    // Not a ManagedArray
  }
  return undefined;
}
