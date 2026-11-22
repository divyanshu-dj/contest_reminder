import axios from 'axios';

/**
 * Axios errors carry no `response` when the request never completed - DNS
 * failure, timeout, connection refused. The old handlers read
 * `error.response.status` and `error.data` directly, which threw a TypeError
 * inside the catch block and masked whatever had actually gone wrong.
 */
export const describeError = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        return error.response
            ? `HTTP ${error.response.status} ${JSON.stringify(error.response.data).slice(0, 200)}`
            : `${error.code ?? 'request failed'}: ${error.message}`;
    }
    return error instanceof Error ? error.message : String(error);
};
