const fs = require('node:fs/promises')
const path = require('node:path')
const { withFinalizedMod } = require('@expo/config-plugins')

const ANDROID_NAMESPACE = 'com.digitalreceipt'
const NAMESPACE_DECLARATION = /^\s*namespace\s+['"][^'"]+['"]\s*$/m
const ANDROID_SOURCE_IMPORTS = [
  'import com.digitalreceipt.BuildConfig',
  'import com.digitalreceipt.R',
]

async function patchKotlinSources(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await patchKotlinSources(entryPath)
      continue
    }

    if (!['MainActivity.kt', 'MainApplication.kt'].includes(entry.name)) continue

    const source = await fs.readFile(entryPath, 'utf8')
    const packageDeclaration = source.match(/^package\s+[^\r\n]+/m)
    if (!packageDeclaration) throw new Error(`Could not find package declaration in ${entryPath}`)

    const packageName = packageDeclaration[0].replace(/^package\s+/, '').replace(/`/g, '')
    if (packageName === ANDROID_NAMESPACE) continue

    const imports = ANDROID_SOURCE_IMPORTS.filter(value => !source.includes(value))
    if (imports.length === 0) continue

    const newline = source.includes('\r\n') ? '\r\n' : '\n'
    await fs.writeFile(
      entryPath,
      source.replace(packageDeclaration[0], `${packageDeclaration[0]}${newline}${newline}${imports.join(newline)}`)
    )
  }
}

module.exports = config => withFinalizedMod(config, ['android', async config => {
  if (config.modRequest.introspect) return config

  const appDirectory = path.join(config.modRequest.platformProjectRoot, 'app')
  const buildGradlePath = path.join(appDirectory, 'build.gradle')
  const buildGradle = await fs.readFile(buildGradlePath, 'utf8')
  if (!NAMESPACE_DECLARATION.test(buildGradle)) {
    throw new Error(`Could not find Android namespace declaration in ${buildGradlePath}`)
  }

  await fs.writeFile(
    buildGradlePath,
    buildGradle.replace(NAMESPACE_DECLARATION, `    namespace '${ANDROID_NAMESPACE}'`)
  )
  await patchKotlinSources(path.join(appDirectory, 'src', 'main', 'java'))
  return config
}])
