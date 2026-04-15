const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = Number(process.env.PORT || 3000);
const sourceUrl = process.env.SOURCE_API_URL;
const localFilePath = path.join(__dirname, "vault_ids_to_hide.json");

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/vault-ids", async (_req, res) => {
  const iterationRaw = _req.query.iteration;
  const vaultsRaw = _req.query.vaults;
  const skipRaw = _req.query.skip;

  const iterationNum = Number(iterationRaw ?? 0);
  const iteration =
    Number.isFinite(iterationNum) && iterationNum >= 0
      ? Math.floor(iterationNum)
      : 0;

  const vaultsNum = Number(vaultsRaw ?? 10000);
  const vaults =
    Number.isFinite(vaultsNum) && vaultsNum > 0 ? Math.floor(vaultsNum) : 10000;

  const skipNum = Number(skipRaw ?? 0);
  const skip =
    Number.isFinite(skipNum) && skipNum >= 0 ? Math.floor(skipNum) : 0;

  if (fs.existsSync(localFilePath)) {
    try {
      const raw = fs.readFileSync(localFilePath, "utf8");
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        res.status(500).json({
          error: "Local vault_ids_to_hide.json is not an array",
        });
        return;
      }

      let result = data;
      if (skip > 0) {
        const start = skip;
        const end = skip + vaults;
        result = data.slice(start, end);
      } else if (iteration >= 1) {
        const start = (iteration - 1) * vaults;
        const end = start + vaults;
        result = data.slice(start, end);
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).send(JSON.stringify(result));
      return;
    } catch (err) {
      res.status(500).json({
        error: "Failed to read local vault_ids_to_hide.json",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  }

  if (!sourceUrl || !isValidHttpUrl(sourceUrl)) {
    res.status(500).json({
      error: "SOURCE_API_URL is not set or invalid, and local file missing",
    });
    return;
  }

  try {
    const upstream = await fetch(sourceUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      res.status(502).json({
        error: "Upstream request failed",
        status: upstream.status,
      });
      return;
    }

    const data = await upstream.json();
    if (!Array.isArray(data)) {
      res.status(502).json({
        error: "Upstream response is not an array",
      });
      return;
    }

    let result = data;
    if (iteration >= 1 || skip > 0) {
      const start = (iteration - 1) * vaults + skip;
      const end = start + vaults;
      result = data.slice(start, end);
    }

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(result));
  } catch (err) {
    res.status(502).json({
      error: "Failed to fetch upstream",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

app.listen(port, () => {
  console.log(`fetch-vault API listening on port ${port}`);
});
