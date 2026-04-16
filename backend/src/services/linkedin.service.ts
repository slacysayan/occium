import axios from "axios";
import { env } from "../config/env";

const LI_API = "https://api.linkedin.com/v2";
const LI_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LI_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";

export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.LINKEDIN_CLIENT_ID,
    redirect_uri: `${env.BACKEND_URL}/auth/linkedin/callback`,
    state,
    scope: "openid profile email w_member_social",
  });
  return `${LI_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const res = await axios.post(
    LI_TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.BACKEND_URL}/auth/linkedin/callback`,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return {
    accessToken: res.data.access_token,
    expiresAt: new Date(Date.now() + res.data.expires_in * 1000),
  };
}

export async function fetchLinkedInProfile(accessToken: string): Promise<{
  urn: string;
  name: string;
  email: string;
  picture: string;
}> {
  const res = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = res.data;
  return {
    urn: data.sub, // OpenID Connect sub = person URN
    name: data.name ?? `${data.given_name ?? ""} ${data.family_name ?? ""}`.trim(),
    email: data.email ?? "",
    picture: data.picture ?? "",
  };
}

export interface LinkedInPostParams {
  accessToken: string;
  personUrn: string;
  text: string;
  linkUrl?: string;
  linkTitle?: string;
}

export async function postToLinkedIn(
  params: LinkedInPostParams
): Promise<{ postId: string; postUrl: string }> {
  const { accessToken, personUrn, text, linkUrl, linkTitle } = params;

  const author = personUrn.startsWith("urn:li:person:")
    ? personUrn
    : `urn:li:person:${personUrn}`;

  const body: Record<string, unknown> = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: linkUrl ? "ARTICLE" : "NONE",
        ...(linkUrl
          ? {
              media: [
                {
                  status: "READY",
                  originalUrl: linkUrl,
                  ...(linkTitle
                    ? { title: { text: linkTitle } }
                    : {}),
                },
              ],
            }
          : {}),
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await axios.post(`${LI_API}/ugcPosts`, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  const postId = res.headers["x-restli-id"] ?? res.data.id ?? "";
  return {
    postId,
    postUrl: `https://www.linkedin.com/feed/update/${postId}`,
  };
}
