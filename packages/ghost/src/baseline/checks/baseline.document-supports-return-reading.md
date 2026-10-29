---
name: document-supports-return-reading
description: Documents and documentation remain readable and usable on return.
severity: medium
references:
  - baseline.interface.document > Rules
  - baseline.interface.document > Never
probe: '(rg -n -i "get started free|start free trial|why choose|trusted by|no hidden fees|see plans" -g "*.html" . || echo "no marketing copy markers found"); (rg -n "YOUR_API_KEY|your-api-key|xxx+|TODO|FIXME|<insert|example\.com/api" -g "*.html" -g "*.md" . || echo "no placeholder markers found")'
---

- Flag a paginated document has no fixed page dimensions, or long-document navigation omits the entity, section, or page position readers need for citation or return reading. (`baseline.interface.document > Rules`)
- Flag a table of contents adds no navigation benefit for the document's length and section structure. (`baseline.interface.document > Rules`)
- Flag a data-bearing page has no source citation, or a chart's source is not directly attributed. (`baseline.interface.document > Rules`)
- Flag documentation lacks a single reading column, a how-to title naming the task, a directory title naming the subject, an audience/outcome introduction before the first step, or a final next move naming the next page by title or linking related pages when the sequence ends. (`baseline.interface.document > Rules`)
- Flag long documentation lacks section jump links or sections the reader can open, a directory omits scope, grouped entries, or destination and contents descriptions, or an unbrowsable collection lacks search. (`baseline.interface.document > Rules`)
- Flag warnings are detached from their step or images teach nothing beyond the text. (`baseline.interface.document > Rules`)
- Flag a problem-solving page lacks a support contact when a channel exists or an explicit next action when none exists, or places that help before self-service or after the footer. (`baseline.interface.document > Rules`)
- Flag document-set navigation changes design across pages, current page, open-section, or breadcrumb states are missing, or feedback becomes prominent or expands into a survey. (`baseline.interface.document > Rules`)
- Flag technical documentation addresses the seller served by the integration rather than the person building it. (`baseline.interface.document > Rules`)
- Flag a technical sample cannot run because of a fabricated endpoint, invented field name, silent placeholder, or unnamed step; flag a deliberate omission that does not name what the reader must supply. (`baseline.interface.document > Rules`)
- Flag code is not in a copyable monospace block, code is buried in a sentence, code is shown only as an image, or reference parameters appear only in prose or lack consistent name/type/required/purpose columns. (`baseline.interface.document > Rules`, `baseline.interface.document > Never`)
- Flag technical prose omits why or what to check, the section tree does not locate the current page in the document set, a sequence omits the next page by title, or an invented screen reads as real. (`baseline.interface.document > Rules`)
- Flag marketing heroes, benefit copy, promotional modules, or upsells appear inside documentation, unnecessary cards wrap paragraphs and lists, or code is shown only as an image. (`baseline.interface.document > Never`)

Review the rendered page as well as source.

The probe finds marketing copy that often signals documentation drifting into a landing page, and placeholder markers that often signal incomplete technical samples. Judge by what the marker displaces or whether the page explicitly names what the reader must supply.

Review only applicable guidance. Do not apply a default flag where explicit brand or task guidance replaces that default.
