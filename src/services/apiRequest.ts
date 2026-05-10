import axios, { AxiosRequestConfig } from 'axios';
import urls from '../urls.json';
import { ApiRequestOptions, AuthResponse, IAuthResponse } from '../types/allTypesAndInterfaces';
import { t } from '../i18n';


const baseUrl = urls.REACT_APP_API_URL;

const axiosInstance = axios.create({
  baseURL: baseUrl,
});

export const addAuthTokenToLocalStorage = (token: AuthResponse) => {
  const authResponse = getAuthResponse() || {};

  const newAuthResponse = {
    ...authResponse,
    ...token,
  };
  localStorage.setItem('authResponse', JSON.stringify(newAuthResponse));
};

const getAuthResponse = (): IAuthResponse | null => {
  const storedResponse = localStorage.getItem('authResponse');
  return storedResponse ? JSON.parse(storedResponse) : null;
};

const setAuthorizationHeader = (options: AxiosRequestConfig, token: string) => {
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Extracts a user-facing error message from API error payload.
 * Handles string, object (e.g. { message, detail, error }), and array responses.
 */
function getErrorMessageFromPayload(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    const first = data[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') return getErrorMessageFromPayload(first) ?? null;
    return null;
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const candidates = [obj.message, obj.detail, obj.error, obj.msg];
    for (const c of candidates) {
      if (typeof c === 'string') return c;
      if (c != null && typeof c === 'object') {
        const nested = getErrorMessageFromPayload(c);
        if (nested) return nested;
      }
    }
  }
  return null;
}

const refreshAuthToken = async (refreshToken: string): Promise<AuthResponse> => {
  try {
    const res = await makeApiCall({
      url: '/refresh-token',
      method: 'POST',
      body: {
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      isFormData: false,
    });

    console.log('Token refresh response:', res);
    const refreshTokenData = res.data?.data;
    if (!refreshTokenData?.idToken) {
      handleAuthError();
      throw new Error(t("invalid-token-refresh-response"));
    }

    return refreshTokenData;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
};

// Add cache implementation
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'api_cache_';
const DURATION_IN_MINUTES = 60;
const CACHE_EXPIRY = DURATION_IN_MINUTES * 60 * 1000;

// Generic cache helper functions
const generateCacheKey = (url: string, method: string, data: Record<string, unknown>): string => {
  // For POST requests, we only care about the request_body part of the data
  const keyData = method === 'POST' ? data?.request_body : data;

  const cacheKey =
    CACHE_KEY_PREFIX +
    JSON.stringify({
      url,
      method,
      data: keyData,
    });

  return cacheKey;
};

const getCachedResponse = (key: string): unknown | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) {
      return null;
    }

    const { data, timestamp } = JSON.parse(cached) as CacheEntry;

    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

const setCacheEntry = (key: string, data: unknown) => {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing to cache:', error);
    // If localStorage is full, clear it and try again
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearCache();
      try {
        const entry: CacheEntry = {
          data,
          timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (retryError) {
        console.error('Failed to cache even after clearing:', retryError);
      }
    }
  }
};

// Cache management functions
export const clearCache = () => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
  console.info('Cache cleared');
};

const cleanupCache = () => {
  const now = Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { timestamp } = JSON.parse(cached) as CacheEntry;
          if (now - timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(key);
            console.log('Removed expired cache entry:', key);
          }
        }
      } catch (error) {
        console.error('Error cleaning up cache entry:', error);
        localStorage.removeItem(key);
      }
    }
  }
};

// Run cleanup periodically
setInterval(cleanupCache, CACHE_EXPIRY / 2);

// Update makeApiCall to use the new localStorage cache functions
const makeApiCall = async ({
  url,
  method,
  body,
  options,
  isFormData = false,
  useCache = false,
}: {
  url: string;
  method: string;
  body?: Record<string, unknown>;
  options?: AxiosRequestConfig;
  isFormData?: boolean;
  useCache?: boolean;
}) => {
  // Skip cache for form data or when caching is not requested
  if (isFormData || !useCache) {
    return await axiosInstance({
      url,
      method,
      data: isFormData
        ? body
        : {
            message:t("request-from-frontend"),
            request_info: {},
            request_body: body,
          },
      ...options,
    });
  }

  // For cacheable requests, try cache first
  const data = {
    message:t("request-from-frontend"),
    request_info: {},
    request_body: body,
  };

  const cacheKey = generateCacheKey(url, method, data);
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  // Make the request and cache the response
  const response = await axiosInstance({
    url,
    method,
    data,
    ...options,
  });

  setCacheEntry(cacheKey, response);

  return response;
};

// Since we can't use hooks directly in a non-component function,
// we'll create a navigation handler
let navigationHandler: ((path: string) => void) | null = null;

export const setNavigationHandler = (handler: (path: string) => void) => {
  navigationHandler = handler;
};

const handleAuthError = () => {
  if (navigationHandler) {
    navigationHandler('/auth');
  }
};

const apiRequest = async ({
  url,
  method = 'GET',
  body = {},
  options = {},
  authMode = 'private',
  isAuthRequest = false,
  isFormData = false,
  useCache = false,
}: ApiRequestOptions): Promise<unknown> => {
  const authResponse = getAuthResponse();
  const authResponseFull = authResponse as unknown as AuthResponse;
  const email = authResponseFull?.email?.toLowerCase() || '';
  const isGuest =
    email === 'guest' ||
    email === 'guest@slocator.com' ||
    (authResponseFull as unknown as Record<string, unknown>)?.registered === false ||
    authResponseFull?.localId?.startsWith('guest_') === true;
  const isPublicAuthRequest = authMode === 'public';

  if (!isPublicAuthRequest && authResponse?.idToken) {
    setAuthorizationHeader(options, authResponse.idToken);
  }

  if (isAuthRequest && !authResponse) {
    const hasStoredAuth = !!localStorage.getItem('authResponse');
    if (hasStoredAuth) {
      handleAuthError();
      throw new Error(t("not-authenticated"));
    } else {
      throw new Error(t("not-authenticated-guest-login-in-progress"));
    }
  }

  try {
    const response = await makeApiCall({
      url: url || '',
      method: method || 'GET',
      body,
      options,
      isFormData,
      useCache,
    });
    return response;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data?: Record<string, unknown> } };
    if (axiosErr?.response?.status === 403) {
      if (isPublicAuthRequest) {
        throw new Error(getErrorMessageFromPayload(axiosErr?.response?.data) || t("access-forbidden"));
      }

      if (isGuest) {
        const apiMessage = axiosErr?.response?.data?.detail;
        const isTokenError =
          typeof apiMessage === 'string' &&
          apiMessage.toLowerCase().includes('token');

        // If it's a token issue (expired/invalid), silently re-login
        if (isTokenError) {
          try {
            const loginResponse = await makeApiCall({
              url: urls.login,
              method: 'POST',
              body: {
                email: 'guest@slocator.com',
                password: 'guest',
              },
            });

            const newAuth = loginResponse?.data?.data || loginResponse?.data;
            if (!newAuth?.idToken) {
              throw new Error(t("guest-re-login-failed"));
            }

            localStorage.setItem('authResponse', JSON.stringify(newAuth));
            setAuthorizationHeader(options, newAuth.idToken);

            const retryResponse = await makeApiCall({
              url: url || '',
              method: method || 'GET',
              body,
              options,
              isFormData,
              useCache,
            });
            return retryResponse;
          } catch (reLoginErr) {
            console.error('Guest silent re-login failed:', reLoginErr);
            localStorage.removeItem('authResponse');
            handleAuthError();
            throw new Error(t("guest-session-expired-please-try-again"));
          }
        }

        // Non-token 403 = actual permission denial (e.g. paywall)
        const message =
          typeof apiMessage === 'string'
            ? apiMessage
            : Array.isArray(apiMessage)
              ? apiMessage[0]
              : apiMessage;
        throw new Error(message || t("access-denied-for-guest-user"));
      }
      localStorage.removeItem('authResponse');
      handleAuthError();
      throw new Error(t("access-forbidden"));
    }

    if (axiosErr?.response?.status === 401) {
      const apiMessage = getErrorMessageFromPayload(axiosErr?.response?.data);

      if (isPublicAuthRequest) {
        throw new Error(apiMessage || t("authentication-failed"));
      }

      if (isGuest) {
        // Silent re-login: guest credentials are hardcoded, so just get a fresh token
        try {
          const loginResponse = await makeApiCall({
            url: urls.login,
            method: 'POST',
            body: {
              email: 'guest@slocator.com',
              password: 'guest',
            },
          });

          const newAuth = loginResponse?.data?.data || loginResponse?.data;
          if (!newAuth?.idToken) {
            throw new Error(t("guest-re-login-failed"));
          }

          localStorage.setItem('authResponse', JSON.stringify(newAuth));
          setAuthorizationHeader(options, newAuth.idToken);

          const retryResponse = await makeApiCall({
            url: url || '',
            method: method || 'GET',
            body,
            options,
            isFormData,
            useCache,
          });
          return retryResponse;
        } catch (reLoginErr) {
          console.error('Guest silent re-login failed:', reLoginErr);
          localStorage.removeItem('authResponse');
          handleAuthError();
          throw new Error(t("guest-session-expired-please-try-again"));
        }
      }

      localStorage.removeItem('authResponse');

      if (authResponse?.refreshToken) {
        try {
          const newToken = await refreshAuthToken(authResponse.refreshToken);
          if (!newToken?.idToken) {
            throw new Error(t("invalid-token-refresh-response"));
          }
          addAuthTokenToLocalStorage(newToken);

          setAuthorizationHeader(options, newToken.idToken);
          const retryResponse = await makeApiCall({
            url: url || '',
            method: method || 'GET',
            body,
            options,
            isFormData,
            useCache,
          });
          return retryResponse;
        } catch (tokenErr) {
          console.error('Token refresh error:', tokenErr);
          handleAuthError();
          throw new Error(t("unable-to-refresh-token-please-log-in-again"));
        }
      } else {
        console.error('No refresh token available');
        handleAuthError();
        throw new Error(t("authentication-required"));
      }
    }

    // Handle other error responses (e.g., 400, 422, etc.)
    if (axiosErr?.response) {
      const status = axiosErr.response.status;
      const data = axiosErr.response.data;
      const rawMessage = getErrorMessageFromPayload(data);

      let message = rawMessage || t("request-failed");

      if (rawMessage && rawMessage.includes('|')) {
        const [key, ...params] = rawMessage.split('|');
        // Try translating with parameters, common ones like 'item', 'name', 'count'
        message = t(key.toLowerCase().replace(/_/g, '-'), {
          item: params[0],
          name: params[0],
          count: params[0],
          defaultValue: rawMessage,
        });
      } else if (rawMessage) {
        // Try to translate the whole message by converting it to a key
        // e.g. "Catalog not found" -> "catalog-not-found"
        const key = rawMessage.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        const translated = t(key, { defaultValue: rawMessage });
        message = translated;
      }

      throw new Error(`${message} (Status: ${status})`);
    }

    console.error('API request error:', err);
    throw err;
  }
};

export default apiRequest;
