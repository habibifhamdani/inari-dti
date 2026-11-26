import type {
  BlacklistedUserEntry,
  BlacklistLevel,
  DtiEdition,
  EditionDetailResponse,
  EditionStatus,
  ExtensionPollSummary,
  Submission,
  User,
  VoteEntry,
  WhitelistedEmailEntry,
} from "@/types/dti";

export function isAdminRole(user: User | null | undefined): boolean {
  return user?.role === "admin" || user?.role === "superadmin";
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

const TOKEN_STORAGE_KEY = "inari_dti_token";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const authToken = token !== undefined ? token : getStoredToken();

  const mergedHeaders = new Headers(headers);
  mergedHeaders.set("Accept", "application/json");

  if (!(body instanceof FormData) && body !== undefined && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  if (authToken) {
    mergedHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
    body,
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const errors = data.errors as Record<string, string[]> | undefined;
    const firstFieldError = errors ? Object.values(errors).flat()[0] : undefined;
    const message =
      (typeof data.message === "string" && data.message) ||
      firstFieldError ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status, errors);
  }

  return data as T;
}

async function downloadBlob(path: string, fallbackFilename: string): Promise<void> {
  const authToken = getStoredToken();
  const headers = new Headers();
  headers.set("Accept", "application/json, application/octet-stream, application/zip, image/*");
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // Ignore parse error on non-JSON failure body
    }
    throw new ApiError(message, response.status);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackFilename;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export const api = {
  auth: {
    register: (payload: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
    }) =>
      request<{ message: string; user: User; token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    login: (payload: { email: string; password: string }) =>
      request<{ message: string; user: User; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    logout: () =>
      request<{ message: string }>("/auth/logout", {
        method: "POST",
      }),

    me: () => request<{ user: User }>("/auth/me"),

    verifyEmail: (params: {
      id: string;
      hash: string;
      expires: string;
      signature: string;
    }) => {
      const qs = new URLSearchParams({
        expires: params.expires,
        signature: params.signature,
      });
      return request<{ message: string; already_verified: boolean; user: User }>(
        `/auth/email/verify/${encodeURIComponent(params.id)}/${encodeURIComponent(params.hash)}?${qs.toString()}`
      );
    },

    resendVerification: () =>
      request<{ message: string }>("/auth/email/verification-notification", {
        method: "POST",
      }),

    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: (payload: {
      token: string;
      email: string;
      password: string;
      password_confirmation: string;
    }) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  profile: {
    update: (formData: FormData) =>
      request<{ message: string; user: User }>("/profile", {
        method: "POST",
        body: formData,
      }),

    updatePassword: (payload: {
      current_password: string;
      password: string;
      password_confirmation: string;
    }) =>
      request<{ message: string }>("/profile/password", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  },

  editions: {
    list: () => request<{ editions: DtiEdition[] }>("/editions"),
    active: () => request<EditionDetailResponse>("/editions/active"),
    bySlug: (slug: string) =>
      request<EditionDetailResponse>(`/editions/${encodeURIComponent(slug)}`),
    downloadSubmission: (
      editionId: number,
      submissionId: number,
      fallbackFilename: string
    ) =>
      downloadBlob(
        `/editions/${editionId}/submissions/${submissionId}/download`,
        fallbackFilename
      ),
    downloadAll: (editionId: number, fallbackFilename: string) =>
      downloadBlob(`/editions/${editionId}/download-all`, fallbackFilename),
  },

  submissions: {
    submit: (editionId: number, formData: FormData) =>
      request<{ message: string; overwritten: boolean; submission: Submission }>(
        `/editions/${editionId}/submissions`,
        {
          method: "POST",
          body: formData,
        }
      ),
  },

  votes: {
    sync: (editionId: number, votes: VoteEntry[]) =>
      request<{ message: string; my_votes: VoteEntry[] }>(
        `/editions/${editionId}/votes`,
        {
          method: "POST",
          body: JSON.stringify({ votes }),
        }
      ),

    voteExtension: (editionId: number, agreeToExtend: boolean) =>
      request<{ message: string; extension_poll: ExtensionPollSummary }>(
        `/editions/${editionId}/extension-vote`,
        {
          method: "POST",
          body: JSON.stringify({ agree_to_extend: agreeToExtend }),
        }
      ),
  },

  admin: {
    listEditions: () => request<{ editions: DtiEdition[] }>("/admin/editions"),

    createEdition: (formData: FormData) =>
      request<{ message: string; edition: DtiEdition }>("/admin/editions", {
        method: "POST",
        body: formData,
      }),

    updateEdition: (editionId: number, formData: FormData) => {
      formData.set("_method", "PATCH");
      return request<{ message: string; edition: DtiEdition }>(
        `/admin/editions/${editionId}`,
        {
          method: "POST",
          body: formData,
        }
      );
    },

    deleteEdition: (editionId: number) =>
      request<{ message: string }>(`/admin/editions/${editionId}`, {
        method: "DELETE",
      }),

    listSubmissions: (editionId: number) =>
      request<{ submissions: Submission[] }>(`/admin/editions/${editionId}/submissions`),

    toggleSubmissionVisibility: (submissionId: number, isHidden?: boolean) =>
      request<{ message: string; submission: { id: number; is_hidden: boolean } }>(
        `/admin/submissions/${submissionId}/visibility`,
        {
          method: "PATCH",
          body: JSON.stringify(
            isHidden !== undefined ? { is_hidden: isHidden } : {}
          ),
        }
      ),

    overrideState: (
      editionId: number,
      payload: {
        action:
          | "open_submissions"
          | "extend_submission_deadline"
          | "close_poll_early"
          | "open_voting"
          | "close_voting_early"
          | "set_status";
        days?: number;
        extend?: boolean;
        status?: EditionStatus;
      }
    ) =>
      request<{ message: string; edition: DtiEdition }>(
        `/admin/editions/${editionId}/state-override`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),

    listWhitelist: () =>
      request<{ whitelisted_emails: WhitelistedEmailEntry[] }>(
        "/admin/whitelisted-emails"
      ),

    addWhitelist: (email: string) =>
      request<{ message: string; whitelisted_email: WhitelistedEmailEntry }>(
        "/admin/whitelisted-emails",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        }
      ),

    removeWhitelist: (id: number) =>
      request<{ message: string }>(`/admin/whitelisted-emails/${id}`, {
        method: "DELETE",
      }),

    listUsers: (search?: string) => {
      const qs = search?.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : "";
      return request<{ users: User[] }>(`/admin/users${qs}`);
    },

    updateUserRole: (userId: number, role: "admin" | "member") =>
      request<{ message: string; user: User }>(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),

    listBlacklist: () =>
      request<{ blacklisted_users: BlacklistedUserEntry[] }>("/admin/blacklist"),

    addBlacklist: (payload: {
      user_id: number;
      level: BlacklistLevel;
      reason?: string;
    }) =>
      request<{ message: string; blacklisted_user: BlacklistedUserEntry }>(
        "/admin/blacklist",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),

    removeBlacklist: (id: number) =>
      request<{ message: string }>(`/admin/blacklist/${id}`, {
        method: "DELETE",
      }),
  },
};
