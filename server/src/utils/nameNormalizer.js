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

/**
 * Normalize a name string (trim, remove extra spaces, capitalize properly)
 * @param {string} name - Name to normalize
 * @returns {string} - Normalized name
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return ''
  
  return name
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .split(' ')
    .map(word => {
      // Capitalize first letter, lowercase the rest
      if (word.length === 0) return ''
      if (word.length === 1) return word.toUpperCase()
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
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

  const normalizedInput = normalizeName(inputName)
  let bestMatch = null
  let bestScore = 0

  for (const existingName of existingNames) {
    if (!existingName) continue
    
    const normalizedExisting = normalizeName(existingName)
    const score = similarityScore(normalizedInput, normalizedExisting)
    
    if (score >= threshold && score > bestScore) {
      bestScore = score
      bestMatch = {
        name: normalizedExisting, // Return the normalized version of the existing name
        similarity: score,
        original: existingName
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

  const normalizedInput = normalizeName(inputName)
  const matches = []

  for (const existingName of existingNames) {
    if (!existingName) continue
    
    const normalizedExisting = normalizeName(existingName)
    const score = similarityScore(normalizedInput, normalizedExisting)
    
    if (score >= threshold) {
      matches.push({
        name: normalizedExisting,
        similarity: score,
        original: existingName
      })
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity)
  
  return matches
}

