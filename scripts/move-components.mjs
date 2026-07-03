#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const COMP = path.join(ROOT, "src/components");

const mapping = {
  AmbientBackground: "layout/AmbientBackground",
  GrainOverlay: "layout/GrainOverlay",
  ErrorScene: "layout/ErrorScene",
  MovieCatalog: "catalog/MovieCatalog",
  FilterBar: "catalog/FilterBar",
  EmptyCatalog: "catalog/EmptyCatalog",
  MovieCard: "movies/MovieCard",
  MovieForm: "movies/MovieForm",
  AddMovieForm: "movies/AddMovieForm",
  MovieRating: "movies/MovieRating",
  MovieApproveButton: "movies/MovieApproveButton",
  MovieReleasesTooltip: "movies/MovieReleasesTooltip",
  GenrePicker: "movies/GenrePicker",
  DuplicateMergeBanner: "movies/DuplicateMergeBanner",
  MergeMoviesModal: "movies/MergeMoviesModal",
  ReleaseEditor: "releases/ReleaseEditor",
  MovieReleasePanel: "releases/MovieReleasePanel",
  MovieReleasePageHeader: "releases/MovieReleasePageHeader",
  ReleaseStorageBadge: "releases/ReleaseStorageBadge",
  FranchiseCard: "franchises/FranchiseCard",
  FranchiseForm: "franchises/FranchiseForm",
  FranchiseCoverUpload: "franchises/FranchiseCoverUpload",
  FranchiseSlotsEditor: "franchises/FranchiseSlotsEditor",
  FranchiseSlotCard: "franchises/FranchiseSlotCard",
  FranchiseSlotsView: "franchises/FranchiseSlotsView",
  FranchisePlaceholder: "franchises/FranchisePlaceholder",
  FranchiseCompletionMeter: "franchises/FranchiseCompletionMeter",
  FranchiseQualityReel: "franchises/FranchiseQualityReel",
  FranchiseSlotTooltip: "franchises/FranchiseSlotTooltip",
  FranchiseDeleteButton: "franchises/FranchiseDeleteButton",
  EmptyFranchises: "franchises/EmptyFranchises",
  MoviePickerDialog: "franchises/MoviePickerDialog",
  MovieFranchisePicker: "franchises/MovieFranchisePicker",
  FranchiseSlotPickerDialog: "franchises/FranchiseSlotPickerDialog",
  StoragePicker: "shared/StoragePicker",
  TrackEditorSection: "shared/TrackEditorSection",
  SpecTag: "shared/SpecTag",
  Pagination: "primitives/Pagination",
  QualityGauge: "primitives/QualityGauge",
  RatingStepper: "primitives/RatingStepper",
  StarRating: "primitives/StarRating",
  PremiumBadge: "primitives/PremiumBadge",
};

function moveFiles() {
  for (const target of new Set(Object.values(mapping))) {
    fs.mkdirSync(path.join(COMP, path.dirname(target)), { recursive: true });
  }

  for (const [name, target] of Object.entries(mapping)) {
    const from = path.join(COMP, `${name}.tsx`);
    if (!fs.existsSync(from)) {
      console.warn(`missing ${name}.tsx`);
      continue;
    }
    const to = path.join(COMP, `${target}.tsx`);
    fs.renameSync(from, to);
    console.log(`moved ${name}.tsx -> ${target}.tsx`);
  }
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "generated" || ent.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function updateImports() {
  const files = walk(path.join(ROOT, "src"));
  const entries = Object.entries(mapping).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const file of files) {
    let text = fs.readFileSync(file, "utf8");
    let changed = false;

    for (const [name, target] of entries) {
      const from = `@/components/${name}`;
      const to = `@/components/${target}`;
      if (text.includes(from)) {
        text = text.split(from).join(to);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, text);
      console.log(`updated: ${path.relative(ROOT, file)}`);
    }
  }
}

function fixComponentRelativeImports() {
  const compFiles = walk(COMP);
  const entries = Object.entries(mapping).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const file of compFiles) {
    let text = fs.readFileSync(file, "utf8");
    let changed = false;

    // primitives relative -> alias
    for (const pat of [
      ['from "./primitives/', 'from "@/components/primitives/'],
      ["from './primitives/", "from '@/components/primitives/"],
      ['from "../primitives/', 'from "@/components/primitives/'],
      ["from '../primitives/", "from '@/components/primitives/"],
    ]) {
      if (text.includes(pat[0])) {
        text = text.split(pat[0]).join(pat[1]);
        changed = true;
      }
    }

    for (const [name, target] of entries) {
      for (const prefix of ['./', "../"]) {
        const from = `from "${prefix}${name}"`;
        const to = `from "@/components/${target}"`;
        if (text.includes(from)) {
          text = text.split(from).join(to);
          changed = true;
        }
        const fromS = `from '${prefix}${name}'`;
        const toS = `from '@/components/${target}'`;
        if (text.includes(fromS)) {
          text = text.split(fromS).join(toS);
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
fixComponentRelativeImports();
console.log("done");
