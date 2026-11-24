const fs = require('node:fs/promises')
const path = require('node:path')
const { withFinalizedMod } = require('@expo/config-plugins')

const ANDROID_NAMESPACE = 'com.digitalreceipt'
const NAMESPACE_DECLARATION = /^\s*namespace\s+['"][^'"]+['"]\s*$/m

module.exports = config => withFinalizedMod(config, ['android', async config => {
  if (config.modRequest.introspect) return config

  const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'app', 'build.gradle')
  const buildGradle = await fs.readFile(buildGradlePath, 'utf8')
  if (!NAMESPACE_DECLARATION.test(buildGradle)) {
    throw new Error(`Could not find Android namespace declaration in ${buildGradlePath}`)
  }

  await fs.writeFile(
    buildGradlePath,
    buildGradle.replace(NAMESPACE_DECLARATION, `    namespace '${ANDROID_NAMESPACE}'`)
  )
  return config
}])
