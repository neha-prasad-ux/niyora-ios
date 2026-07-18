require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'NiyoraGemma'
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

  # LiteRT-LM on iOS ships as the MediaPipe GenAI task pods. The Swift side
  # compiles behind `#if canImport(MediaPipeTasksGenAI)`, so if these pods are
  # ever absent the module builds the "unsupported" stub and no Gemma symbol is
  # referenced. No entitlement or purpose string is needed: the model runs
  # on-device and no user data leaves the phone.
  s.dependency 'MediaPipeTasksGenAI'
  s.dependency 'MediaPipeTasksGenAIC'

  # The Gemma weights (~3GB) are bundled into the app at BUILD time, not stored
  # in git. `scripts/fetch-model.mjs` writes the .task file into ./model before
  # the iOS build; CocoaPods then copies it into the app bundle so the model is
  # present from first launch with no on-device download. If the file is
  # missing at build time the pod install still succeeds, but availability()
  # will report "modelNotReady" at runtime and the session stays scripted.
  s.resources = ['model/*.task']

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
