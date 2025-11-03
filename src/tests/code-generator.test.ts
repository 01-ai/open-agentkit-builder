import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { generatePythonSDK } from '@/lib/code-generator'

const fixturesDir = path.resolve(__dirname, 'code-generator')

// Recursively find all test case directories that contain both input.json and expected_output.py
function findTestCases(dir: string, basePath: string = ''): string[] {
  const testCases: string[] = []

  const items = fs.readdirSync(dir)

  for (const item of items) {
    const itemPath = path.join(dir, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      const inputJsonPath = path.join(itemPath, 'input.json')
      const expectedOutputPath = path.join(itemPath, 'expected_output.py')
      const expectedErrorPath = path.join(itemPath, 'expected_error.txt')

      // Check if this directory contains both required files
      if (fs.existsSync(inputJsonPath) && fs.existsSync(expectedOutputPath)) {
        const relativePath = path.relative(fixturesDir, itemPath)
        testCases.push(relativePath)
      } else if (
        fs.existsSync(inputJsonPath) &&
        fs.existsSync(expectedErrorPath)
      ) {
        // This is an error test case
        const relativePath = path.relative(fixturesDir, itemPath)
        testCases.push(relativePath)
      } else {
        // Recursively search subdirectories
        testCases.push(...findTestCases(itemPath, basePath))
      }
    }
  }

  return testCases
}

describe('Code Generator', () => {
  // Find all test case directories recursively
  const testCases = findTestCases(fixturesDir)

  // Dynamically create a test for each case
  testCases.forEach((casePath) => {
    const testName = casePath.replace(/\//g, '_')
    it(`should correctly generate code for: ${testName}`, () => {
      const caseDir = path.join(fixturesDir, casePath)
      const inputJsonPath = path.join(caseDir, 'input.json')
      const expectedOutputPath = path.join(caseDir, 'expected_output.py')
      const expectedErrorPath = path.join(caseDir, 'expected_error.txt')

      // Check if this is an error test case
      const isErrorCase = fs.existsSync(expectedErrorPath)

      if (isErrorCase) {
        // Error test case
        if (
          !fs.existsSync(inputJsonPath) ||
          !fs.existsSync(expectedErrorPath)
        ) {
          throw new Error(
            `Error test case ${casePath} is missing input.json or expected_error.txt`
          )
        }

        const workflowJson = fs.readFileSync(inputJsonPath, 'utf-8')
        const expectedError = fs.readFileSync(expectedErrorPath, 'utf-8').trim()

        // Generate the code using our implementation
        const result = generatePythonSDK(workflowJson)

        // Check that we got an error
        expect(result.error).toBeTruthy()
        expect(result.code).toBe('')
        expect(result.error).toContain(expectedError)
      } else {
        // Success test case
        if (
          !fs.existsSync(inputJsonPath) ||
          !fs.existsSync(expectedOutputPath)
        ) {
          throw new Error(
            `Test case ${casePath} is missing input.json or expected_output.py`
          )
        }

        const workflowJson = fs.readFileSync(inputJsonPath, 'utf-8')
        const expectedPythonCode = fs.readFileSync(expectedOutputPath, 'utf-8')

        // Generate the code using our implementation
        const result = generatePythonSDK(workflowJson)

        // Check for errors
        if (result.error) {
          throw new Error(`Code generation failed: ${result.error}`)
        }

        // The actual assertion
        expect(result.code.trim()).toEqual(expectedPythonCode.trim())
      }
    })
  })
})
