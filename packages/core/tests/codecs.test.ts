import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  arrayCodec,
  booleanCodec,
  dateCodec,
  defineCodec,
  enumCodec,
  numberCodec,
  schemaCodec,
  stringCodec,
} from '../src'
import type { ParseResult } from '../src'

const value = <T>(result: ParseResult<T>) => (result.ok ? result.value : undefined)
const reason = <T>(result: ParseResult<T>) => (result.ok ? undefined : result.issue.reason)

describe('stringCodec', () => {
  it('round-trips any string', () => {
    const codec = stringCodec()
    expect(value(codec.parse('emma'))).toBe('emma')
    expect(codec.serialize('emma')).toBe('emma')
  })

  it('trims, then checks lengths and pattern', () => {
    const codec = stringCodec({ trim: true, minLength: 2, maxLength: 5, pattern: /^[a-z]+$/ })
    expect(value(codec.parse('  vue '))).toBe('vue')
    expect(reason(codec.parse('a'))).toBe('option')
    expect(reason(codec.parse('abcdef'))).toBe('option')
    expect(reason(codec.parse('Vue'))).toBe('option')
  })

  it('gives the same answer every time with a global pattern', () => {
    const codec = stringCodec({ pattern: /^[a-z]+$/g })
    expect([codec.parse('vue'), codec.parse('vue'), codec.parse('vue')].map(value)).toStrictEqual([
      'vue',
      'vue',
      'vue',
    ])
  })
})

describe('numberCodec', () => {
  it('round-trips finite numbers', () => {
    const codec = numberCodec()
    expect(value(codec.parse('42'))).toBe(42)
    expect(value(codec.parse('-1.5'))).toBe(-1.5)
    expect(codec.serialize(42)).toBe('42')
  })

  it('rejects values that are not finite numbers', () => {
    const codec = numberCodec()
    expect(reason(codec.parse('abc'))).toBe('format')
    expect(reason(codec.parse(''))).toBe('format')
    expect(reason(codec.parse('Infinity'))).toBe('format')
  })

  it('checks int, min and max', () => {
    const codec = numberCodec({ int: true, min: 1, max: 10 })
    expect(reason(codec.parse('1.5'))).toBe('option')
    expect(reason(codec.parse('0'))).toBe('option')
    expect(reason(codec.parse('11'))).toBe('option')
    expect(value(codec.parse('10'))).toBe(10)
  })

  it('clamps to min and max when asked', () => {
    const codec = numberCodec({ min: 10, max: 100, outOfRange: 'clamp' })
    expect(value(codec.parse('5'))).toBe(10)
    expect(value(codec.parse('500'))).toBe(100)
  })

  it('runs validate after the built-in options', () => {
    const codec = numberCodec({ min: 0, validate: (amount) => amount % 1000 === 0 })
    expect(value(codec.parse('40000'))).toBe(40000)
    expect(reason(codec.parse('40500'))).toBe('validate')
    expect(reason(codec.parse('-1000'))).toBe('option')
  })
})

describe('booleanCodec', () => {
  it('accepts only true and false', () => {
    const codec = booleanCodec()
    expect(value(codec.parse('true'))).toBe(true)
    expect(value(codec.parse('false'))).toBe(false)
    expect(reason(codec.parse('1'))).toBe('format')
    expect(codec.serialize(true)).toBe('true')
  })
})

describe('enumCodec', () => {
  it('accepts only the listed values', () => {
    const codec = enumCodec(['grid', 'table'])
    expect(value(codec.parse('grid'))).toBe('grid')
    expect(reason(codec.parse('kanban'))).toBe('format')
  })
})

describe('dateCodec', () => {
  it('reads and writes calendar dates', () => {
    const codec = dateCodec({ format: 'date' })
    expect(value(codec.parse('2024-01-31'))?.toISOString()).toBe('2024-01-31T00:00:00.000Z')
    expect(codec.serialize(new Date('2024-01-31T00:00:00.000Z'))).toBe('2024-01-31')
    expect(reason(codec.parse('2024-01-31T10:00:00Z'))).toBe('format')
  })

  it('reads and writes full timestamps', () => {
    const iso = '2024-01-01T10:30:00.000Z'
    const codec = dateCodec({ format: 'datetime' })
    expect(value(codec.parse(iso))?.toISOString()).toBe(iso)
    expect(reason(codec.parse('yesterday'))).toBe('format')
  })

  it('rejects days that do not exist and timestamps without a timezone', () => {
    expect(reason(dateCodec({ format: 'date' }).parse('2024-02-30'))).toBe('format')
    expect(reason(dateCodec({ format: 'date' }).parse('2023-02-29'))).toBe('format')
    expect(value(dateCodec({ format: 'date' }).parse('2024-02-29'))).toBeInstanceOf(Date)
    const datetime = dateCodec({ format: 'datetime' })
    expect(reason(datetime.parse('1'))).toBe('format')
    expect(reason(datetime.parse('March 5'))).toBe('format')
    expect(reason(datetime.parse('2024-01-31 10:00'))).toBe('format')
    expect(reason(datetime.parse('2024-01-31T10:00'))).toBe('format')
    expect(value(datetime.parse('2024-01-31T10:00+02:00'))?.toISOString()).toBe(
      '2024-01-31T08:00:00.000Z',
    )
  })

  it('checks and clamps a range', () => {
    const min = new Date('2024-01-01T00:00:00.000Z')
    expect(reason(dateCodec({ format: 'date', min }).parse('2023-12-31'))).toBe('option')
    expect(
      value(dateCodec({ format: 'date', min, outOfRange: 'clamp' }).parse('2023-12-31')),
    ).toStrictEqual(min)
  })
})

describe('arrayCodec', () => {
  it('splits and joins with a separator', () => {
    const codec = arrayCodec(numberCodec(), { separator: '|' })
    expect(value(codec.parse('1|2|3'))).toStrictEqual([1, 2, 3])
    expect(codec.serialize([1, 2, 3])).toBe('1|2|3')
  })

  it('round-trips an empty list as an empty value', () => {
    const codec = arrayCodec(stringCodec())
    expect(value(codec.parse(''))).toStrictEqual([])
    expect(codec.serialize([])).toBe('')
  })

  it('escapes items that contain the separator', () => {
    const codec = arrayCodec(stringCodec())
    const raw = codec.serialize(['a,b', 'c', '100%'])
    expect(raw).toBe('a%2Cb,c,100%25')
    expect(value(codec.parse(raw ?? ''))).toStrictEqual(['a,b', 'c', '100%'])
  })

  it('rejects the whole list on one invalid item by default', () => {
    const codec = arrayCodec(enumCodec(['open', 'closed']))
    expect(reason(codec.parse('open,bogus'))).toBe('format')
  })

  it('drops invalid items when asked, keeping an issue', () => {
    const result = arrayCodec(enumCodec(['open', 'closed']), { invalidItems: 'drop' }).parse(
      'open,bogus,closed',
    )
    expect(result).toMatchObject({ ok: true, value: ['open', 'closed'] })
    expect(result.issue?.message).toContain('"bogus"')
  })

  it('removes duplicates and checks the item count', () => {
    expect(value(arrayCodec(stringCodec(), { unique: true }).parse('a,b,a'))).toStrictEqual([
      'a',
      'b',
    ])
    expect(reason(arrayCodec(stringCodec(), { maxItems: 2 }).parse('a,b,c'))).toBe('option')
    expect(reason(arrayCodec(stringCodec(), { minItems: 2 }).parse('a'))).toBe('option')
  })
})

describe('schemaCodec', () => {
  const sort = schemaCodec(z.object({ key: z.string(), direction: z.enum(['asc', 'desc']) }))

  it('reads and writes an object as JSON', () => {
    expect(value(sort.parse('{"key":"name","direction":"asc"}'))).toStrictEqual({
      key: 'name',
      direction: 'asc',
    })
    expect(sort.serialize({ key: 'name', direction: 'asc' })).toBe(
      '{"direction":"asc","key":"name"}',
    )
  })

  it('rejects JSON the schema refuses, and text that is not JSON', () => {
    expect(reason(sort.parse('{"key":"name","direction":"up"}'))).toBe('validate')
    expect(reason(sort.parse('nope'))).toBe('format')
  })

  it('writes object keys in a stable order', () => {
    expect(sort.serialize({ direction: 'asc', key: 'name' })).toBe(
      sort.serialize({ key: 'name', direction: 'asc' }),
    )
  })

  it('writes nested object keys in a stable order', () => {
    const nested = schemaCodec(z.object({ a: z.object({ x: z.number(), y: z.number() }) }))
    expect(nested.serialize({ a: { y: 2, x: 1 } })).toBe('{"a":{"x":1,"y":2}}')
  })

  describe('with a custom format', () => {
    const compact = schemaCodec(z.object({ key: z.string(), direction: z.enum(['asc', 'desc']) }), {
      format: {
        parse: (raw) => {
          const [key, direction] = raw.split(':')
          return { key, direction }
        },
        serialize: ({ key, direction }) => `${key}:${direction}`,
      },
    })

    it('reads and writes the custom format, still checked by the schema', () => {
      expect(compact.serialize({ key: 'name', direction: 'asc' })).toBe('name:asc')
      expect(value(compact.parse('name:asc'))).toStrictEqual({ key: 'name', direction: 'asc' })
      expect(reason(compact.parse('name:up'))).toBe('validate')
    })

    it('turns a format.parse that throws into a rejection', () => {
      const throwing = schemaCodec(z.string(), {
        format: {
          parse: () => {
            throw new Error('boom')
          },
          serialize: (text) => text,
        },
      })
      expect(reason(throwing.parse('x'))).toBe('format')
    })
  })

  it('rejects an async schema instead of crashing', () => {
    const asyncCodec = schemaCodec(z.object({ x: z.number() }).refine(async () => true))
    expect(reason(asyncCodec.parse('{"x":1}'))).toBe('validate')
  })
})

describe('defineCodec', () => {
  const rangeCodec = defineCodec<[number, number]>({
    parse(raw) {
      const [min, max] = raw.split('..').map(Number)
      return min !== undefined && max !== undefined && Number.isFinite(min) && Number.isFinite(max)
        ? { ok: true, value: [min, max] }
        : { ok: false, issue: { reason: 'format', message: 'not a range' } }
    },
    serialize: ([min, max]) => `${min}..${max}`,
  })

  it('builds a codec that takes the shared options', () => {
    const codec = rangeCodec({ default: [0, 500], validate: ([min, max]) => min <= max })
    expect(value(codec.parse('10..20'))).toStrictEqual([10, 20])
    expect(reason(codec.parse('20..10'))).toBe('validate')
    expect(codec.defaultValue).toStrictEqual([0, 500])
  })

  it('turns a parse that throws into a rejection', () => {
    const throwing = defineCodec<string>({
      parse: () => {
        throw new Error('boom')
      },
      serialize: (text) => text,
    })()
    expect(reason(throwing.parse('x'))).toBe('format')
  })
})

describe('development checks', () => {
  it('warns when a default breaks its own rules', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    numberCodec({ default: 0, min: 1 })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('breaks its own rules'))
    warn.mockRestore()
  })
})
