# fetch-vault

Simple API that proxies a GET API response to serve vault IDs.

## Setup

Install dependencies:

```bash
npm install
```

## Run

```bash
SOURCE_API_URL="https://example.com/vault_ids_to_hide.json" npm start
```

## Endpoints

- `GET /health`
- `GET /vault-ids`

The `/vault-ids` endpoint fetches JSON from `SOURCE_API_URL` and returns it.
