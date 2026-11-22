// Character offsets into the original transcript; end is exclusive.
export async function grade({ challenge, transcript }) {
  const t = transcript.toLowerCase();
  const manipulation =
    /grader|ignore (the |all |previous )?rules|give me (full|100)|score me/.test(
      t,
    );
  const delegated = /figure .*out|do (all )?the thinking/.test(t);
  const purpose = /app|pwa|tool|list|tracker|timer/.test(t);
  const user =
    /roommate|household|student|friend|team|user|family|reader|runner/.test(t);
  const behavior = (
    t.match(
      /add|bought|price|balance|show|save|mark|track|split|remind|start|record|search/g,
    ) || []
  ).length;
  const scoped = /\bno\b|for now|to start|mvp|only|don't need|defer/.test(t);
  const verbose = /so basically|so yeah/.test(t);
  const relevant = challenge
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .some((w) => t.includes(w.replace(/s$/, '')));
  const dimensions = delegated
    ? { completeness: 0, clarity: 2, actionability: 0, scopeControl: 0 }
    : {
        completeness:
          purpose && user && behavior >= 4 && relevant
            ? 4
            : purpose && user
              ? 2
              : purpose
                ? 1
                : 0,
        clarity: !t.trim() ? 0 : verbose || behavior < 4 ? 3 : 4,
        actionability: behavior >= 4 ? 3 : behavior ? 2 : 0,
        scopeControl: scoped ? 4 : purpose ? 1 : 0,
      };
  const words = [...transcript.matchAll(/\b[\w'-]+\b/g)];
  const seen = new Set();
  const duplicatedSpans = [];
  for (let i = 0; i <= words.length - 4; i++) {
    const key = words
      .slice(i, i + 4)
      .map((w) => w[0].toLowerCase())
      .join(' ');
    if (seen.has(key))
      duplicatedSpans.push({
        start: words[i].index,
        end: words[i + 3].index + words[i + 3][0].length,
      });
    seen.add(key);
  }
  for (const m of transcript.matchAll(
    /so it's splitting[^.]*\.|so yeah[^.]*\./gi,
  ))
    duplicatedSpans.push({ start: m.index, end: m.index + m[0].length });
  return { dimensions, duplicatedSpans, manipulation };
}
