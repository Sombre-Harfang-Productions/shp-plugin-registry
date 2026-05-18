# SHP Plugin Registry

Central index of plugins distributed via the **SHP Plugin Manager**.

The `manifest.json` at the root of this repo is fetched by the manager on each Refresh. Each entry describes one plugin: where to find its releases, what the asset is called, and where to install it.

## Available plugins

See `manifest.json` for the canonical list. Current entries:

| ID | Slug | Display name | Category |
|---|---|---|---|
| `shp.vocalstrip`         | `vocalstrip`         | SHP Vocal Strip              | channel-strip |
| `shp.guitarstrip`        | `guitarstrip`        | SHP Guitar Strip             | channel-strip |
| `shp.bassstrip`          | `bassstrip`          | SHP Bass Strip               | channel-strip |
| `shp.multibandsaturator` | `multibandsaturator` | SHP Multiband Tube Saturator | saturation |
| `shp.doubletracking`     | `doubletracking`     | SHP Double Tracking          | stereo-imaging |
| `shp.drumbus`            | `drumbus`            | SHP Drum Bus                 | bus-processor |

Binary releases live in [`Sombre-Harfang-Productions/shp-builds`](https://github.com/Sombre-Harfang-Productions/shp-builds).

## Adding a new plugin

1. Add an entry to the `plugins` array in `manifest.json` (see schema below).
2. Optionally drop an icon at `icons/<slug>.png` and update `icon_url`.
3. Commit and push. The manager picks it up on its next Refresh — no app update needed.

> **Shortcut:** for a new plugin described in a `shp-roadmap` issue, use the `/createPlugins <issue#>` skill in any Claude Code session opened at `D:\projets\vst3` — it scaffolds the source repo, sets secrets, adds this manifest entry, and tags v0.1.0 automatically.

## Manifest schema (v2)

```jsonc
{
  "schema_version": 2,
  "min_manager_version": "0.1.0",  // managers older than this should refuse to use
  "plugins": [
    {
      "id":               "shp.vocalstrip",                                                        // unique, stable forever
      "slug":             "vocalstrip",                                                            // short id for paths/filenames
      "name":             "SHP Vocal Strip",                                                       // display name in the manager
      "category":         "channel-strip",
      "github_repo":      "Sombre-Harfang-Productions/shp-builds",                                 // where releases live (all plugins share shp-builds)
      "tag_prefix":       "vocalstrip-v",                                                          // tag prefix on shp-builds — must end with "-v"
      "asset_pattern":    "shp-vocalstrip-{version}-win64.zip",                                    // zip filename pattern; {version} = tag minus "v"
      "vst3_bundle_name": "SHP Vocal Strip.vst3",                                                  // exact folder name to install
      "description":      "Vocal channel strip — clean, fry, growl",
      "icon_url":         "https://raw.githubusercontent.com/Sombre-Harfang-Productions/shp-plugin-registry/main/icons/vocalstrip.png"
    }
  ]
}
```

**Critical fields:**

- `tag_prefix` — must end with `-v` and exactly match `<slug>-v`. The manager filters all `shp-builds` releases by this prefix to find the plugin's versions.
- `asset_pattern` — used to find the right `.zip` among a Release's assets. `{version}` is substituted with the tag minus the leading `v`.
- `vst3_bundle_name` — must match the exact folder name produced by the plugin's CMake build (including spaces and casing). The manager installs/uninstalls by this name.
- `id` — must never change once published. The manager keys its install state by `id`.

## Releasing a plugin

In the plugin's private source repo, on `main`:

```bash
git tag v0.1.1
git push origin v0.1.1
```

CI on the source repo (`runs-on: windows-2022`) builds the VST3, generates the versioned PDF manual from `MANUAL_FR.md`, and cross-publishes both as a Release on `shp-builds` tagged `<slug>-v0.1.1`. The manager sees the new version on its next Refresh.

## PDF manuals

The Node-based generator under `manuals/` is invoked by every plugin's release workflow to convert each plugin's `MANUAL_FR.md` into a paginated PDF. Each release on `shp-builds` carries both the `.zip` bundle and a `SHP.<Name>.-.Manual.v<version>.pdf` file (spaces in name → dots).
