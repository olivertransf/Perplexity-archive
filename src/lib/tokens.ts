const STOPWORDS = new Set(
  `a about above after again against all also am an and another any are aren't as at be because been before being below between both but by can can't could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he her here hers herself him himself his how i if in into is isn't it its itself just like me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should shouldn't so some such than that the their theirs them themselves then there these they this those through to too under until up very was wasn't we were weren't what when where which while who whom why will with won't would wouldn't you your yours yourself yourselves www http https com org net html www
  make want know time first work year good need something really think better also people their them some other than most these
  `.split(/\s+/),
)

export type TokenCount = { text: string; count: number }

function tokensOf(query: string): string[] {
  return (query.toLowerCase().match(/[a-z][a-z']{2,}/g) ?? []).filter((token) => !STOPWORDS.has(token))
}

export function lexicon(queries: string[]): { tokens: TokenCount[]; bigrams: TokenCount[] } {
  const tokens = new Map<string, number>()
  const bigrams = new Map<string, number>()
  for (const query of queries) {
    const words = tokensOf(query)
    let previous = ''
    for (const word of words) {
      tokens.set(word, (tokens.get(word) ?? 0) + 1)
      if (previous) {
        const pair = `${previous} ${word}`
        bigrams.set(pair, (bigrams.get(pair) ?? 0) + 1)
      }
      previous = word
    }
  }
  const ranked = (counts: Map<string, number>, limit: number) =>
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([text, count]) => ({ text, count }))
  return { tokens: ranked(tokens, 40), bigrams: ranked(bigrams, 20) }
}
