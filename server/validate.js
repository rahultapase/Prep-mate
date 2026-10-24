// Small input helpers shared by the routes

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function optionalString(value, field, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new HttpError(400, `${field} is too long (max ${maxLength})`);
  return trimmed;
}

export function requiredString(value, field, maxLength) {
  const str = optionalString(value, field, maxLength);
  if (!str) throw new HttpError(400, `${field} is required`);
  return str;
}

export function stringArray(value, field, maxItems, maxItemLength) {
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array`);
  if (value.length > maxItems) throw new HttpError(400, `${field} has too many items`);
  return value.map((item, i) => {
    if (typeof item !== 'string') throw new HttpError(400, `${field}[${i}] must be a string`);
    if (item.length > maxItemLength) throw new HttpError(400, `${field}[${i}] is too long`);
    return item;
  });
}

export function plainObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an object`);
  }
  return value;
}

export function rating(value, field) {
  const n = Number(value ?? 0);
  if (!Number.isInteger(n) || n < 0 || n > 5) throw new HttpError(400, `${field} must be 0-5`);
  return n;
}
