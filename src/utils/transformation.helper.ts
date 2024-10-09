import { formatISO, parseISO } from 'date-fns';

export class Transformation {
  static mapDateToString(value?: Date | string): string {
    if (typeof value === 'string') {
      return value;
    }
    return formatISO(value);
  }

  static mapStringToDate(value?: string | Date): Date {
    if (value instanceof Date) {
      return value;
    }
    return parseISO(value);
  }
}
