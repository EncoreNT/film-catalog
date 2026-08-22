import { describe, expect, it } from "vitest";
import { detectVideoHdr } from "@/lib/media/ffprobe";
import {
  framesHaveHdr10Plus,
  resolveProbedHdr,
} from "@/lib/media/ffprobe-parse";

type HdrStream = Parameters<typeof detectVideoHdr>[0];

describe("detectVideoHdr", () => {
  it("detects DV Profile 8 (HDR10 base) from DOVI side data before smpte2084", () => {
    const stream = {
      color_transfer: "smpte2084",
      color_primaries: "bt2020",
      color_space: "bt2020nc",
      pix_fmt: "yuv420p10le",
      profile: "Main 10",
      side_data_list: [
        {
          side_data_type: "DOVI configuration record",
          dv_version_major: 1,
          dv_version_minor: 0,
          dv_profile: 8,
          dv_level: 6,
          rpu_present_flag: 1,
          el_present_flag: 0,
          bl_present_flag: 1,
          dv_bl_signal_compatibility_id: 1,
        },
      ],
    } as unknown as HdrStream;

    expect(detectVideoHdr(stream)).toBe("DV:P8");
  });

  it("detects DV Profile 8.4 (HLG base) from compatibility id", () => {
    const stream = {
      color_transfer: "arib-std-b67",
      side_data_list: [
        {
          side_data_type: "DOVI configuration record",
          dv_profile: 8,
          dv_bl_signal_compatibility_id: 4,
        },
      ],
    } as unknown as HdrStream;

    expect(detectVideoHdr(stream)).toBe("DV:P8.4");
  });

  it("detects plain HDR10 when only PQ transfer is present", () => {
    const stream = {
      color_transfer: "smpte2084",
      color_primaries: "bt2020",
      color_space: "bt2020nc",
      pix_fmt: "yuv420p10le",
      profile: "Main 10",
    } as unknown as HdrStream;

    expect(detectVideoHdr(stream)).toBe("HDR10");
  });

  it("detects Dolby Vision from tag strings with profile", () => {
    const stream = {
      tags: { title: "Dolby Vision Profile 7 FEL rip" },
    } as unknown as HdrStream;

    expect(detectVideoHdr(stream)).toBe("DV:P7FEL");
  });

  it("detects DV Profile 7 MEL from side data", () => {
    const stream = {
      side_data_list: [
        {
          side_data_type: "DOVI configuration record",
          dv_profile: 7,
          rpu_present_flag: 1,
          el_present_flag: 1,
          bl_present_flag: 0,
        },
      ],
    } as unknown as HdrStream;

    expect(detectVideoHdr(stream)).toBe("DV:P7");
  });
});

describe("resolveProbedHdr", () => {
  it("does not treat DOVI compatibility id 6 (UHD Blu-ray HDR10 BL) as HDR10+", () => {
    const stream = {
      color_transfer: "smpte2084",
      side_data_list: [
        {
          side_data_type: "DOVI configuration record",
          dv_profile: 7,
          el_present_flag: 1,
          bl_present_flag: 1,
          dv_bl_signal_compatibility_id: 6,
        },
      ],
    } as unknown as HdrStream;

    expect(resolveProbedHdr(stream)).toEqual({
      hdr: "DV:P7FEL",
      hasHdr10Plus: false,
    });
  });

  it("keeps DV Profile 8 and flags HDR10+ from ST 2094-40 frames", () => {
    const stream = {
      color_transfer: "smpte2084",
      side_data_list: [
        {
          side_data_type: "DOVI configuration record",
          dv_profile: 8,
          dv_bl_signal_compatibility_id: 1,
        },
      ],
    } as unknown as HdrStream;

    expect(resolveProbedHdr(stream, true)).toEqual({
      hdr: "DV:P8",
      hasHdr10Plus: true,
    });
  });

  it("upgrades plain HDR10 to HDR10+ when frames have ST 2094-40", () => {
    const stream = {
      color_transfer: "smpte2084",
    } as unknown as HdrStream;

    expect(resolveProbedHdr(stream, true)).toEqual({
      hdr: "HDR10+",
      hasHdr10Plus: true,
    });
  });

  it("leaves HDR10 without plus when no overlay signal", () => {
    const stream = {
      color_transfer: "smpte2084",
    } as unknown as HdrStream;

    expect(resolveProbedHdr(stream)).toEqual({
      hdr: "HDR10",
      hasHdr10Plus: false,
    });
  });
});

describe("framesHaveHdr10Plus", () => {
  it("detects SMPTE 2094-40 side data", () => {
    expect(
      framesHaveHdr10Plus([
        {
          side_data_list: [
            { side_data_type: "HDR Dynamic Metadata SMPTE2094-40 (HDR10+)" },
          ],
        },
      ]),
    ).toBe(true);
    expect(
      framesHaveHdr10Plus([
        { side_data_list: [{ side_data_type: "Mastering display metadata" }] },
      ]),
    ).toBe(false);
  });
});
