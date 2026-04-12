/**
 * Name normalization utilities to prevent duplicate entries with spelling errors
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Distance (0 = identical, higher = more different)
 */
export function levenshteinDistance(str1, str2) {
  const s1 = (str1 || '').toLowerCase().trim()
  const s2 = (str2 || '').toLowerCase().trim()

  if (s1 === s2) return 0
  if (s1.length === 0) return s2.length
  if (s2.length === 0) return s1.length

  const matrix = []
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[s2.length][s1.length]
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
export function similarityScore(str1, str2) {
  const s1 = (str1 || '').toLowerCase().trim()
  const s2 = (str2 || '').toLowerCase().trim()

  if (s1 === s2) return 1.0
  if (s1.length === 0 || s2.length === 0) return 0.0

  const maxLength = Math.max(s1.length, s2.length)
  const distance = levenshteinDistance(s1, s2)
  return 1 - (distance / maxLength)
}

const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Treat "Surname, Given [Middle…]" (comma after surname) as standard form input and
 * reorder to "Given … Surname" so the family name is always last, e.g. "Camposo, Kris" → "Kris Camposo".
 * Only the first comma splits surname vs given; extra commas in the given part become spaces.
 */
export function reorderLastCommaFirst(name) {
  if (!name || typeof name !== 'string') return ''

  let s = name.trim().replace(/\s+/g, ' ')
  s = s.replace(/\s*,\s*/g, ', ')

  const commaIdx = s.indexOf(',')
  if (commaIdx === -1) return s

  const lastPart = s.slice(0, commaIdx).trim()
  let firstPart = s.slice(commaIdx + 1).trim().replace(/\s*,\s*/g, ' ')
  firstPart = firstPart.replace(/\s+/g, ' ').trim()

  if (!lastPart || !firstPart) {
    return s.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  }

  return `${firstPart} ${lastPart}`.replace(/\s+/g, ' ').trim()
}

/** Normalize token for suffix lookup (strip trailing period, lowercase). */
const suffixLookupKey = (word) =>
  String(word ?? '')
    .trim()
    .replace(/\.$/, '')
    .toLowerCase()

/** Generational / ordinal suffixes → canonical trailing form. */
const SUFFIX_CANONICAL = new Map([
  ['jr', 'Jr.'],
  ['sr', 'Sr.'],
  ['ii', 'II'],
  ['iii', 'III'],
  ['iv', 'IV'],
  ['vi', 'VI'],
  ['vii', 'VII'],
  ['2nd', '2nd'],
  ['3rd', '3rd'],
  ['4th', '4th'],
])

export function isNameSuffixToken(word) {
  const key = suffixLookupKey(word)
  return key.length > 0 && SUFFIX_CANONICAL.has(key)
}

export function formatNameSuffix(word) {
  const key = suffixLookupKey(word)
  return SUFFIX_CANONICAL.get(key) ?? word
}

/**
 * Move generational suffix tokens to the very end: "Cresencio Jr. Camposo" → "Cresencio Camposo Jr."
 */
export function moveSuffixesToEnd(words) {
  if (!words || words.length === 0) return []
  const base = []
  const suffixes = []
  for (const w of words) {
    if (!w) continue
    if (isNameSuffixToken(w)) suffixes.push(w)
    else base.push(w)
  }
  return [...base, ...suffixes]
}

/**
 * Title-case one token but keep Excel-style acronyms (LGU, PFO, BFAR, SAAD).
 * Hyphenated chunks are handled separately so "LGU-Tubigon" → "LGU-Tubigon".
 */
const titleCaseWord = (word) => {
  if (!word || word.length === 0) return ''
  if (word.includes('-')) {
    const segs = word
      .split('-')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => titleCaseWord(p))
    if (segs.length > 0) return segs.join('-')
    if (word === '-') return '-'
  }
  if (word.length === 1) return word.toUpperCase()
  const letters = word.replace(/[^A-Za-z]/g, '')
  if (
    letters.length >= 2 &&
    letters.length <= 6 &&
    letters === letters.toUpperCase() &&
    word === word.toUpperCase()
  ) {
    return word
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Fingerprint with word order ignored (handles "Japhet Ken Candog" vs "Candog, Japhet Ken").
 */
export function nameSortKey(name) {
  if (!name || typeof name !== 'string') return ''
  return name
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length > 0)
    .sort()
    .join(' ')
}

/**
 * Strong match if every significant token (2+ chars) from one side appears as a whole word in the other.
 */
export function tokenCoverageScore(a, b) {
  const na = normalizeName(a)
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const nb = normalizeName(b)
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordsA = na.split(' ').filter((t) => t.length >= 2)
  const wordsB = nb.split(' ').filter((t) => t.length >= 2)
  if (wordsA.length === 0 && wordsB.length === 0) return 0

  const covers = (tokens, haystack) => {
    if (tokens.length === 0) return false
    return tokens.every((w) => new RegExp(`(^|\\s)${escapeReg(w)}(\\s|$)`, 'i').test(haystack))
  }

  if (covers(wordsA, nb) || covers(wordsB, na)) return 0.92
  return 0
}

/**
 * Best of: direct similarity, order-agnostic token sort, token coverage (full names vs "Last, First").
 */
export function nameMatchScore(inputName, existingName) {
  const ni = normalizeName(inputName)
  const ne = normalizeName(existingName)
  if (!ni || !ne) return 0

  const direct = similarityScore(ni, ne)
  const sorted = similarityScore(nameSortKey(inputName), nameSortKey(existingName))
  const tokens = tokenCoverageScore(inputName, existingName)

  return Math.max(direct, sorted, tokens)
}

/**
 * Normalize a name: "Last, First …" → "First … Last" (surname last), suffixes last (Jr., III, …),
 * trim, collapse spaces, title-case given + surname only.
 * @param {string} name - Name to normalize
 * @returns {string} - Normalized name
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return ''

  const reordered = reorderLastCommaFirst(name)
  const rawWords = reordered.trim().replace(/\s+/g, ' ').split(' ').filter((w) => w.length > 0)
  const ordered = moveSuffixesToEnd(rawWords)

  const parts = []
  for (const word of ordered) {
    if (isNameSuffixToken(word)) {
      parts.push(formatNameSuffix(word))
    } else {
      const t = titleCaseWord(word)
      if (t) parts.push(t)
    }
  }

  return parts.join(' ')
}

/**
 * Find the best matching name from a list of existing names
 * @param {string} inputName - The name to match
 * @param {string[]} existingNames - Array of existing names to search
 * @param {number} threshold - Minimum similarity score (0-1), default 0.8
 * @returns {object|null} - { name: string, similarity: number } or null if no match found
 */
export function findBestMatch(inputName, existingNames, threshold = 0.8) {
  if (!inputName || !existingNames || existingNames.length === 0) {
    return null
  }

  if (!normalizeName(inputName)) {
    return null
  }

  let bestMatch = null
  let bestScore = 0

  for (const existingName of existingNames) {
    if (!existingName) continue

    const score = nameMatchScore(inputName, existingName)

    if (score >= threshold && score > bestScore) {
      bestScore = score
      bestMatch = {
        name: normalizeName(existingName),
        similarity: score,
        original: existingName,
      }
    }
  }

  return bestMatch
}

/**
 * Find all similar names above a threshold
 * @param {string} inputName - The name to match
 * @param {string[]} existingNames - Array of existing names to search
 * @param {number} threshold - Minimum similarity score (0-1), default 0.7
 * @returns {array} - Array of { name: string, similarity: number } sorted by similarity
 */
export function findSimilarNames(inputName, existingNames, threshold = 0.7) {
  if (!inputName || !existingNames || existingNames.length === 0) {
    return []
  }

  if (!normalizeName(inputName)) {
    return []
  }

  const matches = []

  for (const existingName of existingNames) {
    if (!existingName) continue

    const score = nameMatchScore(inputName, existingName)

    if (score >= threshold) {
      matches.push({
        name: normalizeName(existingName),
        similarity: score,
        original: existingName,
      })
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity)

  return matches
}

