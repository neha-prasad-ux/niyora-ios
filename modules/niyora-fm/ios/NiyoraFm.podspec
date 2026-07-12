require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'NiyoraFm'
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

  # FoundationModels is a system framework that only exists in the iOS 26 SDK.
  # The Swift side compiles behind `#if canImport(FoundationModels)` plus
  # `@available(iOS 26, *)` runtime checks, so on older SDKs (or below the
  # deployment target) this module builds the "unsupported" stub paths and the
  # framework is never referenced. No entitlement or purpose string is needed:
  # the model runs on-device and no user data leaves the phone.

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
