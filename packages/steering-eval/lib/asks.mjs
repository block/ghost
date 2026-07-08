export function parseAsks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const asks = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    current.body = current.bodyLines.join("\n").trim();
    delete current.bodyLines;
    asks.push(current);
  };

  for (const line of lines) {
    const heading = line.match(/^##\s+Ask\s+(\d+)\s+[—-]\s+(.+)\s*$/u);
    if (heading) {
      flush();
      current = {
        n: Number(heading[1]),
        title: heading[2].trim(),
        body: "",
        bodyLines: [],
        expect: [],
        poison: [],
        discount: [],
      };
      continue;
    }

    if (!current) continue;

    const meta = line.match(/^\s*(expect|poison|discount):\s*(.*?)\s*$/u);
    if (meta) {
      current[meta[1]] = splitIds(meta[2]);
      continue;
    }

    current.bodyLines.push(line);
  }

  flush();
  return asks;
}

function splitIds(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
