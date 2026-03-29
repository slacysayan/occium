export const appEnv = {
  appName: process.env.REACT_APP_APP_NAME || "Occium",
  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || "",
  youtubeApiKey: process.env.REACT_APP_YOUTUBE_API_KEY || "",
  localHelperUrl: "https://occium-yt-dlp-host.onrender.com",
  enableGoogleConnect: process.env.REACT_APP_ENABLE_GOOGLE_CONNECT !== "false",
  defaultUserName: process.env.REACT_APP_DEFAULT_USER_NAME || "Occium Workspace",
  defaultUserEmail: process.env.REACT_APP_DEFAULT_USER_EMAIL || "local@occium.app",
};
