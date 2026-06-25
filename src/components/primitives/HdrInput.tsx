"use client";

import { motion, AnimatePresence } from "motion/react";
import { Sun, Zap } from "lucide-react";
import { SegmentedControl } from "./SegmentedControl";
import { Select } from "./Select";
import { InfoHint } from "./InfoHint";
import {
  HDR_BASE_FORMATS,
  DOLBY_VISION_PROFILES,
  buildHdrValue,
  parseHdrValue,
  type DictOption,
} from "@/lib/dictionaries";

interface HdrInputProps {
  /** Stored hdr value: "SDR", a base format, or "DV:P8" for Dolby Vision + profile. */
  value: string;
  onChange: (value: string) => void;
  baseOptions?: DictOption[];
  dolbyVisionProfiles?: DictOption[];
}

const DEFAULT_BASE = "HDR10";
const DV_BASE = "DolbyVision";

function isHdr(value: string): boolean {
  return value !== "SDR" && value !== "" && value != null;
}

export function HdrInput({
  value,
  onChange,
  baseOptions = HDR_BASE_FORMATS,
  dolbyVisionProfiles = DOLBY_VISION_PROFILES,
}: HdrInputProps) {
  const hdrOn = isHdr(value);
  const { base, dvProfile } = parseHdrValue(value);

  const handleToggle = (mode: "sdr" | "hdr") => {
    if (mode === "sdr") {
      onChange("SDR");
    } else if (!hdrOn) {
      onChange(DEFAULT_BASE);
    }
  };

  const handleBaseChange = (nextBase: string) => {
    if (nextBase === DV_BASE) {
      onChange(buildHdrValue(nextBase, dvProfile));
    } else {
      onChange(nextBase);
    }
  };

  const handleDvProfileChange = (nextProfile: string) => {
    onChange(buildHdrValue(DV_BASE, nextProfile));
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <p className="text-sm text-muted">Динамический диапазон</p>
          <InfoHint
            label="Динамический диапазон"
            text="SDR — обычный диапазон. HDR — расширенный: яркость и цвет выше. Выберите формат, для Dolby Vision — ещё и профиль."
          />
        </div>
        <SegmentedControl
          ariaLabel="Динамический диапазон"
          value={hdrOn ? "hdr" : "sdr"}
          onChange={(v) => handleToggle(v as "sdr" | "hdr")}
          options={[
            { value: "sdr", label: "SDR", icon: <Sun className="h-4 w-4" /> },
            { value: "hdr", label: "HDR", icon: <Zap className="h-4 w-4" /> },
          ]}
        />
      </div>

      <AnimatePresence initial={false}>
        {hdrOn ? (
          <motion.div
            key="base"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <Select
              label="Формат HDR"
              value={base === "SDR" ? DEFAULT_BASE : base}
              onChange={handleBaseChange}
              options={baseOptions}
              preserveOrder
              hint="HDR10, HDR10+, Dolby Vision или HLG. Dolby Vision дополнительно уточняется профилем."
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {hdrOn && base === DV_BASE ? (
          <motion.div
            key="dv-profile"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <Select
              label="Профиль Dolby Vision"
              value={dvProfile}
              onChange={handleDvProfileChange}
              options={dolbyVisionProfiles}
              preserveOrder
              hint="P5/P7/P8 — способы кодирования DV. P7FEL — полный слой улучшения. Пусто — без профиля."
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
