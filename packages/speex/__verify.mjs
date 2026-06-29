// Verify the actual behavior of the failing tests
import { hexToHsl, hslToHex, isLight, complementary, alpha, mix } from './src/color/index.js'
import { escapeRegExp } from './src/string/index.js'

console.log('=== escapeRegExp ===')
const escaped = escapeRegExp('.*+?^${}()|[]\\')
console.log('Result:', JSON.stringify(escaped))
// What the test expects with wrong escaping:
const wrongExpected = '\\.*\+\?\^\$\{\}\(\)\|\[\]\\'
console.log('Wrong expected:', JSON.stringify(wrongExpected))
// What the test should expect:
const correctExpected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\'
console.log('Correct expected:', JSON.stringify(correctExpected))
console.log('Match correct:', escaped === correctExpected)
console.log('Match wrong:', escaped === wrongExpected)

console.log('\n=== HSL roundtrip ===')
const colors = ['#ff0000', '#00ff00', '#0000ff', '#ff8800', '#800080']
for (const c of colors) {
  const hsl = hexToHsl(c)
  console.log(`${c} -> HSL(${hsl?.h}, ${hsl?.s}, ${hsl?.l})`)
  const result = hslToHex(hsl?.h ?? 0, hsl?.s ?? 0, hsl?.l ?? 0)
  console.log(`  -> ${result} (${result.toLowerCase() === c ? 'PASS' : 'FAIL - expected ' + c})`)
}

console.log('\n=== isLight ===')
console.log('isLight("bad"):', isLight('bad'))

console.log('\n=== complementary ===')
console.log('complementary("bad"):', complementary('bad'))

console.log('\n=== alpha ===')
console.log('alpha("bad", 0.5):', alpha('bad', 0.5))

console.log('\n=== mix ===')
console.log('mix("bad", "#ff0000"):', mix('bad', '#ff0000'))
console.log('mix("#ff0000", "bad"):', mix('#ff0000', 'bad'))
