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
  # LiteRT-LM, vendored. It is published SPM-only (no CocoaPod exists; the
  # `LiteRTSwift` pod is the tensor runtime, a different thing), and this
  # project is entirely CocoaPods. Rather than bolt an SPM package reference
  # onto the Xcode project, the prebuilt xcframework and the Swift wrapper from
  # the v0.14.0 release are vendored here, keeping one dependency system.
  #
  # This is the ONLY runtime that can load a fine-tuned Gemma 4: litert-torch
  # emits `.litertlm` exclusively and MediaPipe's bundler has no Gemma 4 model
  # type. The xcframework carries ios-arm64 and ios-arm64-simulator slices, so
  # the simulator works too.
  s.vendored_frameworks = 'vendor/CLiteRTLM.xcframework'

  # MediaPipe stays for the legacy `.task` path. Google has it in
  # maintenance-only mode, so it is the fallback, not the default.
  s.dependency 'MediaPipeTasksGenAI'
  s.dependency 'MediaPipeTasksGenAIC'

  # The Gemma weights (~3GB) are bundled into the app at BUILD time, not stored
  # in git. `scripts/fetch-model.mjs` writes the .task file into ./model before
  # the iOS build; CocoaPods then copies it into the app bundle so the model is
  # present from first launch with no on-device download. If the file is
  # missing at build time the pod install still succeeds, but availability()
  # will report "modelNotReady" at runtime and the session stays scripted.
  # Both container formats. `.litertlm` is LiteRT-LM (the current runtime, and
  # the only one that can load a fine-tuned Gemma 4); `.task` is MediaPipe (the
  # legacy path). The Swift side prefers `.litertlm` when both are present, so
  # ship ONE of them -- bundling both is 5+ GB of app.
  s.resources = ['model/*.task', 'model/*.litertlm']

  # Explicit rather than a bare **/* glob: that would also sweep the vendored
  # framework's own headers into the pod's compile sources.
  s.source_files = ['*.{h,m,swift}', 'vendor/LiteRTLM/*.swift']
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
