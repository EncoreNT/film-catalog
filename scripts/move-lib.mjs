#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LIB = path.join(ROOT, "src/lib");

const mapping = {
  prisma: "db/prisma",
  settings: "db/settings",
  "data-path": "db/data-path",
  "api-utils": "api/api-utils",
  validators: "api/validators",
  slug: "shared/slug",
  "text-trim": "shared/text-trim",
  "russian-plural": "shared/russian-plural",
  format: "shared/format",
  duration: "shared/duration",
  calendar: "shared/calendar",
  "display-path": "shared/display-path",
  dictionaries: "shared/dictionaries",
  resolution: "shared/resolution",
  "storage-types": "shared/storage-types",
  channels: "media/channels",
  ffprobe: "media/ffprobe",
  "name-parser": "media/name-parser",
  "file-hash": "media/file-hash",
  scanner: "media/scanner",
  "apply-probe": "media/apply-probe",
  "spec-tags": "media/spec-tags",
  "cover-formats": "covers/cover-formats",
  "cover-formats-mkv": "covers/cover-formats-mkv",
  mkv: "covers/mkv",
  "cover-storage": "covers/cover-storage",
  "cover-url": "covers/cover-url",
  "franchise-cover-url": "covers/franchise-cover-url",
  "movie-include": "movies/movie-include",
  "movie-slug": "movies/movie-slug",
  "movie-match-key": "movies/movie-match-key",
  "movie-genres": "movies/movie-genres",
  genres: "movies/genres",
  "movie-form-types": "movies/movie-form-types",
  "build-movie-payload-tracks": "movies/build-movie-payload-tracks",
  "build-movie-payload": "movies/build-movie-payload",
  "movie-query": "movies/movie-query",
  "movie-franchise-memberships": "movies/movie-franchise-memberships",
  "movie-tracks": "releases/movie-tracks",
  "movie-file-meta": "releases/movie-file-meta",
  "load-movie-file-meta": "releases/load-movie-file-meta",
  "release-api": "releases/release-api",
  "release-storage": "releases/release-storage",
  "release-primary": "releases/release-primary",
  "release-detail-view": "releases/release-detail-view",
  "russian-audio-formats": "catalog/russian-audio-formats",
  "audio-track-scope": "catalog/audio-track-scope",
  "genre-facet-sort": "catalog/genre-facet-sort",
  "catalog-facets": "catalog/catalog-facets",
  "archive-metrics": "catalog/archive-metrics",
  "franchise-include": "franchises/franchise-include",
  "franchise-slug": "franchises/franchise-slug",
  "franchise-query": "franchises/franchise-query",
  "franchise-slots": "franchises/franchise-slots",
  "franchise-slot-placement": "franchises/franchise-slot-placement",
  "franchise-utils": "franchises/franchise-utils",
  "franchise-metrics": "franchises/franchise-metrics",
  "franchise-summary": "franchises/franchise-summary",
  "alternative-quality": "merge/alternative-quality",
  "merge-preview-types": "merge/merge-preview-types",
  "merge-preview": "merge/merge-preview",
  "merge-candidate-label": "merge/merge-candidate-label",
  "movie-merge": "merge/movie-merge",
};

function moveFiles() {
  for (const target of new Set(Object.values(mapping))) {
    fs.mkdirSync(path.join(LIB, path.dirname(target)), { recursive: true });
  }

  for (const [name, target] of Object.entries(mapping)) {
    for (const suffix of ["", ".test"]) {
      const from = path.join(LIB, `${name}${suffix}.ts`);
      if (!fs.existsSync(from)) continue;
      const to = path.join(LIB, `${target}${suffix}.ts`);
      fs.renameSync(from, to);
      console.log(`moved ${name}${suffix}.ts -> ${target}${suffix}.ts`);
    }
  }
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "generated" || ent.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(ts|tsx|mjs)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function updateImports() {
  const files = [
    ...walk(path.join(ROOT, "src")),
    ...walk(path.join(ROOT, "scripts")),
  ];

  const entries = Object.entries(mapping).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const file of files) {
    let text = fs.readFileSync(file, "utf8");
    let changed = false;

    for (const [name, target] of entries) {
      const patterns = [
        [`@/lib/${name}`, `@/lib/${target}`],
        [`../src/lib/${name}`, `../src/lib/${target}`],
        [`../../src/lib/${name}`, `../../src/lib/${target}`],
      ];
      for (const [from, to] of patterns) {
        if (text.includes(from)) {
          text = text.split(from).join(to);
          changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(file, text);
      console.log(`updated imports: ${path.relative(ROOT, file)}`);
    }
  }
}

function fixRelativeLibImports() {
  const libFiles = walk(LIB);
  const entries = Object.entries(mapping).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const file of libFiles) {
    let text = fs.readFileSync(file, "utf8");
    let changed = false;

    for (const [name, target] of entries) {
      const relPatterns = [
        [`from "./${name}"`, `from "@/lib/${target}"`],
        [`from './${name}'`, `from '@/lib/${target}'`],
        [`from "../${name}"`, `from "@/lib/${target}"`],
        [`from '../${name}'`, `from '@/lib/${target}'`],
      ];
      for (const [from, to] of relPatterns) {
        if (text.includes(from)) {
          text = text.split(from).join(to);
          changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(file, text);
      console.log(`fixed relative: ${path.relative(ROOT, file)}`);
    }
  }
}

moveFiles();
updateImports();
fixRelativeLibImports();
console.log("done");
