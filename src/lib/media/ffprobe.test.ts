import { describe, expect, it } from "vitest";
import { detectVideoHdr } from "@/lib/media/ffprobe";

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
