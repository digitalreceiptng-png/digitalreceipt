const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const ANDROID_NAMESPACE = 'ng.digitalreceipt.merchant'

function setNamespace(contents) {
  return contents.replace(/namespace ['"][^'"]+['"]/, `namespace '${ANDROID_NAMESPACE}'`)
}

module.exports = function withAndroidNamespaceFix(config) {
  config = withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = setNamespace(config.modResults.contents)
    }
    return config
  })

  return withDangerousMod(config, ['android', async config => {
    const root = config.modRequest.platformProjectRoot
    const sourceDirectory = path.join(root, 'app/src/main/java/com/digitalreciept/final')
    for (const fileName of ['MainApplication.kt', 'MainActivity.kt']) {
      const filePath = path.join(sourceDirectory, fileName)
      let contents = await fs.promises.readFile(filePath, 'utf8')
      contents = contents.replace(/^package .+$/m, `package ${ANDROID_NAMESPACE}`)
      contents = contents.replace(/^import android\./m, `import ${ANDROID_NAMESPACE}.BuildConfig\n\nimport android.`)
      if (fileName === 'MainActivity.kt') {
        contents = contents.replace(/^import android\.os\./m, `import ${ANDROID_NAMESPACE}.R\n\nimport android.os.`)
      }
      await fs.promises.writeFile(filePath, contents)
    }

    return config
  }])
}
