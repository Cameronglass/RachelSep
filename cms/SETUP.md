# Rachel’s website editor

## Current status

The local integration is implemented. It extracts 14 projects, 7 pages and 84
unique photographs from the existing site, then generates the same 21 public
pages. The original HTML, CSS, JavaScript, photographs and contact form are
preserved as source templates and as the offline migration source.

Sanity project `4jmyx4hk`, public dataset `production`, is connected. All 22
content documents (14 projects, 7 pages and site settings) are imported and
passed Sanity document validation. All 84 source photo paths were uploaded;
Sanity deduplicated identical files into 79 stored image assets.

The authenticated editor is deployed at:
https://rachelsep-4jmyx4hk.sanity.studio/

The source is in https://github.com/Cameronglass/RachelSep, preserving the
repository's original history. The existing Netlify site serving rachelsep.com
is connected to its `main` branch with build command `npm run build` and publish
directory `dist`. Its site ID is `ee3e1d4e-ab70-4264-9a46-c341f0ae70ed`.

The Sanity content webhook is configured for published create/update/delete
events on projects, pages and site settings. Drafts and release versions do not
trigger production builds. Its destination is held privately in Sanity and
Netlify; no build-hook URL or credential is in this repository.

The connected branch preview passed browser checks on all 21 pages and six
mobile layouts. The deployed `/admin` redirect opens the authenticated editor.
See [EDITING.md](../EDITING.md) for the everyday editing workflow.

The previous manual production deploy was `6a5ce0feed3dbdfafe36acad`; it remains
in Netlify's deploy history if a rollback is ever needed.

## One-time connection

1. Create an account at https://www.sanity.io/manage and create a project for
   Rachel’s portfolio with a public dataset named `production`. The public
   dataset holds website content; only signed-in authorized members can edit.
   Do not put private client information into these website documents.
2. Create a private `.env` based on `.env.example`. Set
   `SANITY_STUDIO_PROJECT_ID` to the project ID and
   `SANITY_STUDIO_DATASET=production`. The project ID is not a secret.
3. Run `npx sanity login`, completing sign-in in your own browser, followed by
   `npm run cms:import`. The CLI supplies your token privately to the importer.
   The import uploads each unique photo once and creates the content documents
   in one transaction. Rerunning it preserves documents already in Sanity,
   including documents that currently exist only as drafts.
   Configure the publishing webhook only after this initial import.
4. Run `npm run studio`, open http://127.0.0.1:3333, and confirm the content.
   If prompted, add that exact development origin with credentials under the
   Sanity project’s API / CORS settings.
5. Run `npm run build` and `npm run preview`. Inspect
   http://127.0.0.1:8080. This build reads *published* content directly from
   Sanity and refuses to replace the last generated output if content fails
   validation. The build never falls back to old source content silently.
6. Choose an available Studio hostname and set `SANITY_STUDIO_HOSTNAME` in
   `.env`. Run `npm run studio:deploy` to publish the authenticated editor at
   `https://YOUR-HOSTNAME.sanity.studio`. Rebuild using the real project ID.
7. Connect this source folder to a Git repository and link that repository to
   the existing Netlify site. Keep the existing domain. The local repository is
   initialized, and manual drag-and-drop uploads alone cannot run
   automatic content rebuilds. `.gitignore` excludes credentials, installed
   dependencies and generated output. The checked-in source needs the root
   HTML templates, `models/`, `css/`, `js/`, `images/`, `cms/`, package files,
   Sanity config and `netlify.toml`.
8. In Netlify, set the build command to `npm run build`, publish directory to
   `dist`, and the two `SANITY_STUDIO_*` project/dataset variables to the real
   values. `netlify.toml` already supplies the build settings and Node 24.
   A public dataset requires no token in Netlify. If using a private dataset,
   set a read-only `SANITY_API_TOKEN` in Netlify’s protected build environment.
   Never prefix a token with `SANITY_STUDIO_`.
9. Verify a Netlify deploy preview before deploying the connected build to
   production. Do not upload the whole development folder as the public site.
10. Add a Netlify build hook for the production branch. In Sanity project
    settings, add a webhook sending POST to that hook URL. Enable create,
    update and delete events; leave draft and version events disabled. Filter:

    ```groq
    _type in ["project", "page", "siteSettings"]
    ```

    Keep the hook URL private. Publishing or unpublishing content will then
    trigger a build. Website changes go live only after that build succeeds;
    publishing is not instantaneous. Avoid an extra hook for image assets,
    which would build the site during ordinary uploads.
11. Test the complete workflow: create a draft project, upload photographs,
    inspect its Preview tab, publish, verify it on the live collection and
    project page, then hide and republish the temporary test project.

## Everyday editing

- **Model homes / Commercial spaces:** create or edit a project. Supply its
  name, collection, cover and header photo. Generate the page address before
  first publishing. Add text sections and photo galleries; drag sections and
  photographs to reorder them. Smaller Display order numbers appear first.
- **Preview:** a project’s Preview tab shows its current draft with the site’s
  styles without publishing. It previews the project body, not the full site
  navigation; lightbox and navigation actions are disabled. Full-page previews
  for Home, About and other singleton pages are not implemented in Studio.
- **Hide a project:** turn on Hide this project and publish. The next successful
  build removes its page and all collection, featured and next/previous links.
  Direct links will return 404; there is no redirect to a replacement project.
- **Home / About:** edit text, upload slideshow/portrait photos and choose
  featured projects. Each featured item can optionally use a different cover.
- **Curation / Hand-drawn artwork:** upload, replace and drag gallery photos.
  Curation photos can have a filter value matching a gallery filter, such as
  `westlake`. The gallery always has an All filter.
- **Other pages:** open a Page text item and edit its value. Those text slots
  preserve the existing page structure and support bold, emphasis and line
  breaks. Structural page changes still require template work.
- **Site settings:** edit the logo words, menu labels and footer text.
- **Photo selection:** image fields offer upload and selection of existing
  Sanity assets, along with crop/hotspot controls. For permanent removal from
  asset storage, remove document references first; hiding a project does not
  delete its photographs.

## Development and verification

```sh
npm ci
npm run cms:export
npm run build:local
npm test
npm run preview
```

`build:local` is explicitly offline: it re-extracts the original HTML and uses
local photos. It is useful for checking the integration before creating an
account, but is not the production publishing command.

`npm run studio:build` verifies Studio compilation after a real project ID is
configured. `npx sanity schema validate --level error` checks the schema.
With the local preview server running, `node cms/tests/browser.mjs` checks all
21 desktop pages, six mobile layouts and the menu/gallery interactions in
Chrome. Set `CHROME_PATH` if Chrome is installed somewhere else.

The generated `dist/` is replaced only if it contains the builder’s marker.
Its contents contain public pages and static assets, never `.env`, import
scripts, source configuration, node_modules or Sanity write tokens.

Draft page addresses are validated against the existing published address to
prevent accidental broken links. For deliberate URL changes, add redirects
as a separate development change. Build validation also rejects duplicate or
unsafe project paths, missing page singletons and raw unpublished documents.

Dependency overrides patch vulnerabilities in transitive CLI utilities while
retaining the selected Sanity release. Recheck these overrides when upgrading.

Useful official references:
- https://www.sanity.io/docs/studio/installation
- https://www.sanity.io/docs/studio/deployment
- https://www.sanity.io/docs/content-lake/webhook-best-practices
- https://docs.netlify.com/build/configure-builds/build-hooks/

## Operational checks

Run through the signed-in Sanity CLI so credentials stay in the CLI store:

```sh
npx sanity exec cms/publishing.mjs --with-user-token -- status
npx sanity exec cms/publishing.mjs --with-user-token -- attempts
```

The helper also supports explicit setup actions (`connect`, `hooks`) and build
actions (`preview-build`, `production-build`). `verify-publish` changes only
the hidden settings title and tests a real content-change webhook. It starts a
production build; it is not an offline test. All actions are scoped to this
specific Sanity project, Netlify site and GitHub repository.

To check a hosted deploy instead of localhost:

```sh
SITE_BASE_URL=https://rachelsep.com node cms/tests/browser.mjs
```
