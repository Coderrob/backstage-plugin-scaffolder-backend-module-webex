import axios, { isAxiosError, HttpStatusCode } from 'axios';
import { isString, isError, isHttpOkStatus, isEmptyString } from './utils';

describe('utils', () => {
  describe('isString', () => {
    const positiveCases: readonly [string, unknown][] = [
      ['primitive string', 'hello'],
      ['String object', 'world'],
    ];

    const negativeCases: readonly [string, unknown][] = [
      ['number', 123],
      ['object', {}],
      ['null', null],
      ['undefined', undefined],
      ['array', []],
    ];

    it.each(positiveCases)(
      'should return true for %s',
      (_: string, input: unknown) => {
        expect(isString(input)).toBe(true);
      },
    );

    it.each(negativeCases)(
      'should return false for %s',
      (_: string, input: unknown) => {
        expect(isString(input)).toBe(false);
      },
    );
  });

  describe('isError', () => {
    const positiveCases: readonly [string, unknown][] = [
      ['Error instance', new Error('fail')],
      [
        'Custom Error subclass',
        (() => {
          class CustomError extends Error {}
          return new CustomError('fail');
        })(),
      ],
    ];

    const negativeCases: readonly [string, unknown][] = [
      ['string', 'error'],
      ['object', {}],
      ['null', null],
      ['undefined', undefined],
    ];

    it.each(positiveCases)(
      'should return true for %s',
      (_: string, input: unknown) => {
        expect(isError(input)).toBe(true);
      },
    );

    it.each(negativeCases)(
      'should return false for %s',
      (_: string, input: unknown) => {
        expect(isError(input)).toBe(false);
      },
    );
  });

  describe('isAxiosError', () => {
    const positiveCases: readonly [string, unknown][] = [
      ['AxiosError instance', axios.AxiosError.from(new Error('fail'))],
    ];

    const negativeCases: readonly [string, unknown][] = [
      ['regular Error', new Error('fail')],
      ['string', 'error'],
      ['null', null],
    ];

    it.each(positiveCases)(
      'should return true for %s',
      (_: string, input: unknown) => {
        expect(isAxiosError(input)).toBe(true);
      },
    );

    it.each(negativeCases)(
      'should return false for %s',
      (_: string, input: unknown) => {
        expect(isAxiosError(input)).toBe(false);
      },
    );
  });

  describe('isHttpOkStatus', () => {
    const positiveCases: readonly [string, number][] = [
      ['200 OK', 200],
      ['250', 250],
      ['299', 299],
      ['HttpStatusCode.Ok', HttpStatusCode.Ok],
    ];

    const negativeCases: readonly [string, number][] = [
      ['199', 199],
      ['300', 300],
      ['404', 404],
      ['HttpStatusCode.MultipleChoices', HttpStatusCode.MultipleChoices],
    ];

    it.each(positiveCases)(
      'should return true for %s',
      (_: string, input: number) => {
        expect(isHttpOkStatus(input)).toBe(true);
      },
    );

    it.each(negativeCases)(
      'should return false for %s',
      (_: string, input: number) => {
        expect(isHttpOkStatus(input)).toBe(false);
      },
    );
  });

  describe('isEmptyString', () => {
    const positiveCases: readonly [string, unknown][] = [
      ['empty string', ''],
      ['whitespace string', '   '],
    ];

    const negativeCases: readonly [string, unknown][] = [
      ['non-empty string', 'hello'],
      ['string with spaces', '  world '],
      ['null', null],
      ['undefined', undefined],
      ['number', 123],
      ['object', {}],
    ];

    it.each(positiveCases)(
      'should return true for %s',
      (_: string, input: unknown) => {
        expect(isEmptyString(input)).toBe(true);
      },
    );

    it.each(negativeCases)(
      'should return false for %s',
      (_: string, input: unknown) => {
        expect(isEmptyString(input)).toBe(false);
      },
    );
  });
});
