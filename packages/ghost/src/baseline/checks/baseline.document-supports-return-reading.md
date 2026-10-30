---
name: document-supports-return-reading
description: Documents and documentation remain readable and usable on return.
severity: medium
references:
  - baseline.interface.document > Rules
  - baseline.interface.document > Never
probe: '(rg -n -i "get started free|start free trial|why choose|trusted by|no hidden fees|see plans" -g "*.html" . || echo "no marketing copy markers found"); (rg -n "YOUR_API_KEY|your-api-key|xxx+|TODO|FIXME|<insert|example\.com/api" -g "*.html" -g "*.md" . || echo "no placeholder markers found")'
---

- Inspect representative pages and return-reading paths against `baseline.interface.document > Rules`. Flag pagination, source attribution, or navigation that fails the applicable document criteria; judge the document’s actual length and purpose.
- For instructional and technical pages, follow the task as the person building the integration. Compare runnable samples, warnings, reference material, and next steps against `baseline.interface.document > Rules`; flag failed criteria or missing execution evidence, including whether the sample names what the reader must supply.
- Inspect rendered sections and content presentation against `baseline.interface.document > Never`. Flag the prohibited treatments by their effect on the reading task; the probe’s matching text alone is not a verdict.

The probe finds marketing and placeholder markers such as get started free and YOUR_API_KEY. Review the rendered page and whether a match violates the cited criteria; marker presence alone cannot establish failure.
