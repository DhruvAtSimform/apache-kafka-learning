export const HttpStatusCode = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const HttpErrorCode = {
  HTTP_ERROR: "HTTP_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export class HttpException extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code: string = HttpErrorCode.HTTP_ERROR,
    details?: unknown,
  ) {
    super(message);

    this.name = "HttpException";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestException extends HttpException {
  constructor(
    message = "Bad request",
    details?: unknown,
    code: string = HttpErrorCode.BAD_REQUEST,
  ) {
    super(HttpStatusCode.BAD_REQUEST, message, code, details);
    this.name = "BadRequestException";
  }
}

export class UnauthorizedException extends HttpException {
  constructor(
    message = "Unauthorized",
    details?: unknown,
    code: string = HttpErrorCode.UNAUTHORIZED,
  ) {
    super(HttpStatusCode.UNAUTHORIZED, message, code, details);
    this.name = "UnauthorizedException";
  }
}

export class ForbiddenException extends HttpException {
  constructor(
    message = "Forbidden",
    details?: unknown,
    code: string = HttpErrorCode.FORBIDDEN,
  ) {
    super(HttpStatusCode.FORBIDDEN, message, code, details);
    this.name = "ForbiddenException";
  }
}

export class NotFoundException extends HttpException {
  constructor(
    message = "Resource not found",
    details?: unknown,
    code: string = HttpErrorCode.NOT_FOUND,
  ) {
    super(HttpStatusCode.NOT_FOUND, message, code, details);
    this.name = "NotFoundException";
  }
}

export class ConflictException extends HttpException {
  constructor(
    message = "Conflict",
    details?: unknown,
    code: string = HttpErrorCode.CONFLICT,
  ) {
    super(HttpStatusCode.CONFLICT, message, code, details);
    this.name = "ConflictException";
  }
}

export class InternalServerException extends HttpException {
  constructor(
    message = "An unexpected error occurred",
    details?: unknown,
    code: string = HttpErrorCode.INTERNAL_SERVER_ERROR,
  ) {
    super(HttpStatusCode.INTERNAL_SERVER_ERROR, message, code, details);
    this.name = "InternalServerException";
  }
}
