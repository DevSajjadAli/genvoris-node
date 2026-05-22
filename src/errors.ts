export class GenvorisAPIError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(args: {
    status: number;
    code: string;
    message?: string;
    requestId?: string;
  }) {
    super(args.message ?? args.code);
    this.name = 'GenvorisAPIError';
    this.status = args.status;
    this.code = args.code;
    this.requestId = args.requestId;
  }
}

export class GenvorisAuthError extends GenvorisAPIError {
  constructor(args: {
    status: number;
    code: string;
    message?: string;
    requestId?: string;
  }) {
    super(args);
    this.name = 'GenvorisAuthError';
  }
}

export class GenvorisRateLimitError extends GenvorisAPIError {
  readonly retryAfterSeconds: number;

  constructor(args: {
    status: number;
    code: string;
    message?: string;
    requestId?: string;
    retryAfterSeconds?: number;
  }) {
    super(args);
    this.name = 'GenvorisRateLimitError';
    this.retryAfterSeconds = args.retryAfterSeconds ?? 60;
  }
}

export class GenvorisValidationError extends GenvorisAPIError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(args: {
    status: number;
    code: string;
    message?: string;
    requestId?: string;
    fieldErrors?: Record<string, string[]>;
  }) {
    super(args);
    this.name = 'GenvorisValidationError';
    this.fieldErrors = args.fieldErrors ?? {};
  }
}
