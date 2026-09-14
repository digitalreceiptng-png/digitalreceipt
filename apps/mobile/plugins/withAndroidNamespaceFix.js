const { withAppBuildGradle, withMainActivity, withMainApplication } = require('@expo/config-plugins');

// Android's Gradle `namespace` (used to generate the R/BuildConfig Java classes)
// must be a valid Java package name. Our applicationId, "new.digitalreceipt", is
// invalid for this purpose because "new" is a reserved Java keyword — but it's
// already the live Play Store app id, so we can't change that. We give the
// namespace a different, valid value here and explicitly import BuildConfig
// where the template references it, since it's no longer in the same package
// as MainActivity/MainApplication.
const ANDROID_NAMESPACE = 'ng.digitalreceipt.merchant';

function setNamespace(contents) {
  return contents.replace(/namespace ['"][^'"]+['"]/, `namespace '${ANDROID_NAMESPACE}'`);
}

function ensureImport(contents, className) {
  const usesUnqualified = new RegExp(`(?<!\\.)\\b${className}\\.`).test(contents);
  const alreadyImported = contents.includes(`import ${ANDROID_NAMESPACE}.${className}`);
  if (!usesUnqualified || alreadyImported) {
    return contents;
  }
  return contents.replace(
    /^package .+$/m,
    (match) => `${match}\n\nimport ${ANDROID_NAMESPACE}.${className}`
  );
}

module.exports = function withAndroidNamespaceFix(config) {
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = setNamespace(config.modResults.contents);
    }
    return config;
  });

  config = withMainApplication(config, (config) => {
    config.modResults.contents = ensureImport(config.modResults.contents, 'BuildConfig');
    config.modResults.contents = ensureImport(config.modResults.contents, 'R');
    return config;
  });

  config = withMainActivity(config, (config) => {
    config.modResults.contents = ensureImport(config.modResults.contents, 'BuildConfig');
    config.modResults.contents = ensureImport(config.modResults.contents, 'R');
    return config;
  });

  return config;
};
