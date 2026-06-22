require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'NiyoraHealth'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'MIT'
  s.author         = 'Niyora'
  s.homepage       = 'https://niyora.com'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://niyora.com' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # HealthKit is only compiled + linked into builds that opt in via the
  # NIYORA_HEALTHKIT=1 env var (the `development` and `preview` EAS profiles set
  # it). Production / launch builds leave it unset, so this module compiles a
  # no-op stub with no `import HealthKit` and the framework is never linked --
  # which keeps the App Store binary clear of the HealthKit purpose-string /
  # Guideline 5.1.1 rejections (the entitlement + usage strings are likewise
  # gated, in plugins/withHealthKit.js). See memory
  # project_healthkit_not_in_launch_scope.
  healthkit = ENV['NIYORA_HEALTHKIT'] == '1'
  s.frameworks = 'HealthKit' if healthkit

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => healthkit ? '$(inherited) NIYORA_HEALTHKIT' : '$(inherited)'
  }
end
