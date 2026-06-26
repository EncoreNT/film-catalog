<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cover orientation convention

- **Movie covers are vertical** (portrait, 2:3). Rendered with `object-cover` in portrait containers (e.g. `aspect-[2/3]`).
- **Franchise covers are horizontal** (landscape, 16:9). The list card (`FranchiseCard`) and the detail hero both render the cover with `object-cover` in a 16:9 frame (`aspect-[16/9]`). Upload 16:9 artwork — other aspect ratios are center-cropped to fill the frame. The upload UI (`FranchiseCoverUpload`) previews and hints 16:9.
