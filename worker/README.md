# The short-link service

A Cloudflare Worker that stores encrypted pages, so a link can be about 80 characters instead
of thousands. It is the only server the kit talks to, and it never holds anything it can
read. The format and the encryption are in [`lib/short.js`](../lib/short.js); the plain-terms
account is in [SECURITY.md](../SECURITY.md).

```
https://rlfordon.github.io/explainer/#/v1/kAbCd3fGhT9x_Kq2mWv8Lz4yPn~R5sE
                                           └─ id ─┘└─────── key ────────┘
```

- **The author's computer** encrypts the signed long link (AES-GCM, a fresh 128-bit key per
  link) and uploads only the ciphertext, under a random 8-character id. The upload is signed
  with the author's key; the service refuses anything else.
- **The service** stores the ciphertext in Workers KV and hands it to anyone who asks for
  that id. Without the key it is noise.
- **The viewer** fetches the ciphertext by id, decrypts it with the key from the link (which,
  after the `#`, never leaves the browser), then checks the page's signature exactly as for a
  long link. The service can withhold a page, but it cannot change one or make one up.

## Using it

```sh
node build.mjs page.md --short                 # short link, expires in 90 days
node build.mjs page.md --short --expires 2w    # h, d or w; or never
node build.mjs --short-list                    # every short link made on this computer
node build.mjs --short-delete <link or id>     # withdraw one; it stops opening within a minute
```

`--short` also prints the long link. Keep it as a backup: it works without the service.
The list lives in `~/.explainer-kit/short-links.json`, beside the signing key. It holds the
links themselves, keys included, so guard it like the key.

## Setting it up

Done once, from this folder, with a Cloudflare account (the free plan is enough):

```sh
npx wrangler login
npx wrangler kv namespace create explainer-links   # put the id it prints in wrangler.toml
npx wrangler deploy                                # prints the service's address
```

Then put that address in `kit.json` as `"shortener"`, rebuild the viewer
(`node build.mjs --viewer-only`) and deploy it: the viewer's security policy lets it fetch
from that one address and nowhere else. `node test/live.mjs` checks the whole path.

**The service trusts the keys in `kit.json`, built in when it is deployed.** Whenever
`"keys"` changes (a new key, or a stolen one removed), run `npx wrangler deploy` here as well
as redeploying the viewer.

## What it does

| Request | Who may | What happens |
|---|---|---|
| `GET /<id>` | anyone | The ciphertext, or 404 once it has expired or been withdrawn |
| `POST /<id>` | a trusted author | Stores the body under a new id; never overwrites one |
| `DELETE /<id>` | a trusted author | Withdraws it |

A signed request carries `X-Key`, `X-Time`, `X-Expires` and `X-Signature`; the signature
covers the method, id, expiry, time and the body's SHA-256. A request signed more than five
minutes ago is refused, and a withdrawn id is remembered for ten minutes, so a captured
upload cannot be replayed to bring a page back. The service serves no HTML, only plain text
and ciphertext, so its own address cannot be used to show a page. Workers Logs are off.

## What Cloudflare sees

Which id was fetched, when, and from what IP address and browser; how big each page is; and
when the author uploaded or withdrew one. Never the key, and so never the page.

## Limits and cost

The free plan allows 100,000 opens and 1,000 new links a day, with 1 GB of storage (a page
is a few kilobytes). Each page may be up to 1 MB. Withdrawing a link takes up to a minute
to reach every Cloudflare location.
