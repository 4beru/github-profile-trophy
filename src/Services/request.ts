import {
  EServiceKindError,
  type GithubError,
  ServiceError,
} from "../Types/index.ts";
import { CONSTANTS } from "../utils.ts";

type GraphQLResponse<T> = {
  data?: { user?: T | null };
  errors?: GithubError[];
  message?: string;
};

export async function requestGithubData<T = unknown>(
  query: string,
  variables: Record<string, string>,
  token = "",
): Promise<T> {
  if (!token) {
    throw new ServiceError("GitHub API token is not configured", EServiceKindError.UPSTREAM);
  }

  const response = await fetch(process.env.GITHUB_API || CONSTANTS.DEFAULT_GITHUB_API, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "User-Agent": "github-profile-trophy",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12000),
  });

  const payload = await response.json() as GraphQLResponse<T>;

  if (payload.errors?.length) {
    throw new ServiceError(
      payload.errors.map((error) => error.message).join("; "),
      getGraphQLErrorKind(payload.errors),
    );
  }

  if (!response.ok) {
    const rateLimited = response.status === 429 ||
      (response.status === 403 && /rate.limit/i.test(payload.message || ""));
    throw new ServiceError(
      rateLimited ? "GitHub API rate limit exceeded" : "GitHub API request failed",
      rateLimited ? EServiceKindError.RATE_LIMIT : EServiceKindError.UPSTREAM,
    );
  }

  if (payload.data?.user) return payload.data.user;

  throw new ServiceError("GitHub user not found", EServiceKindError.NOT_FOUND);
}

function getGraphQLErrorKind(errors: GithubError[]): EServiceKindError {
  const types = errors.map((error) => error.type);
  if (types.some((type) => type?.includes(EServiceKindError.RATE_LIMIT))) {
    return EServiceKindError.RATE_LIMIT;
  }
  if (types.every((type) => type === EServiceKindError.NOT_FOUND)) {
    return EServiceKindError.NOT_FOUND;
  }
  return EServiceKindError.UPSTREAM;
}
