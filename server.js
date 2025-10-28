import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import querystring from "querystring";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
let refreshToken = process.env.REFRESH_TOKEN;
let accessToken = null;
let tokenExpiresAt = 0;

/* 🔑 Step 1: Redirect user to Spotify authorization page */
app.get("/login", (req, res) => {
  const scope = "user-read-currently-playing user-read-playback-state";
  const params = querystring.stringify({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scope,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

/* 🔑 Step 2: Spotify redirects here with authorization code */
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization":
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: querystring.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();

  if (data.refresh_token) {
    refreshToken = data.refresh_token;
    console.log("✅ Refresh token saved:", refreshToken);
  }

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  res.send("✅ Spotify authorization complete. You can close this tab.");
});

/* 🕐 Step 3: Automatically refresh token if expired */
async function getAccessToken() {
  if (!refreshToken) {
    throw new Error("No refresh token available. Please visit /login first.");
  }

  // Refresh if expired or missing
  if (!accessToken || Date.now() >= tokenExpiresAt) {
    console.log("🔄 Refreshing Spotify access token...");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization":
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      accessToken = data.access_token;
      tokenExpiresAt = Date.now() + data.expires_in * 1000;
      console.log("✅ Access token refreshed.");
    } else {
      console.error("❌ Failed to refresh token:", data);
    }
  }

  return accessToken;
}

/* 🎧 Step 4: Example endpoint to fetch currently playing song */
app.get("/api/spotify", async (req, res) => {
  try {
    const token = await getAccessToken();
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 204) {
      return res.json({ message: "No track currently playing." });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load Spotify data" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);